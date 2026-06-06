import sqlite3
import csv
import os
import zipfile
import sys  # Importado para permitir aumentar o limite do tamanho dos campos do CSV

# IMPORTANTE: Certifique-se de instalar a biblioteca antes de rodar:
# pip install dbfread
from dbfread import DBF

PASTA_DADOS = os.path.join(os.path.dirname(__file__), "dados")
DB_PATH     = os.path.join(os.path.dirname(__file__), "traceverde.db")

def criar_tabelas(conn):
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS sicar (
            num_car   TEXT PRIMARY KEY,
            situacao  TEXT,
            bioma     TEXT,
            municipio TEXT,
            uf        TEXT
        );
        CREATE TABLE IF NOT EXISTS prodes (
            car     TEXT,
            ano     INTEGER,
            area_ha REAL
        );
        CREATE TABLE IF NOT EXISTS ibama_multas (
            car       TEXT,
            situacao  TEXT,
            descricao TEXT
        );
        CREATE TABLE IF NOT EXISTS icmbio_ucs (
            car     TEXT,
            nome_uc TEXT
        );
        CREATE TABLE IF NOT EXISTS funai_tis (
            car     TEXT,
            nome_ti TEXT
        );
        CREATE TABLE IF NOT EXISTS mapbiomas (
            car           TEXT,
            ano           INTEGER,
            classe_antes  TEXT,
            classe_depois TEXT
        );
    """)
    conn.commit()
    print("  Tabelas criadas ou verificadas com sucesso.")


# ------------------------------------------------------------------ #
#  SICAR — lê o shapefile real do RS                                 #
# ------------------------------------------------------------------ #

def importar_sicar(conn):
    zip_path = os.path.join(PASTA_DADOS, "sicar_RS.zip")
    if not os.path.exists(zip_path):
        print("  sicar_RS.zip nao encontrado, pulando.")
        return

    pasta_sicar = os.path.join(PASTA_DADOS, "sicar_extraido")
    os.makedirs(pasta_sicar, exist_ok=True)
    with zipfile.ZipFile(zip_path, "r") as z:
        z.extractall(pasta_sicar)
    print("  sicar extraido.")

    dbf_path = None
    for raiz, _, arquivos in os.walk(pasta_sicar):
        for arq in arquivos:
            if arq.lower().endswith(".dbf"):
                dbf_path = os.path.join(raiz, arq)
                break

    if dbf_path is None:
        print("  .dbf do SICAR nao encontrado dentro do zip.")
        return

    conn.execute("DELETE FROM sicar")
    total = 0
    tabela = DBF(dbf_path, encoding="latin-1", load=True)

    print(f"  colunas no shapefile SICAR: {tabela.field_names}")

    for rec in tabela:
        rec_lower = {str(k).lower(): v for k, v in rec.items()}
        num_car   = rec_lower.get("cod_imovel") or rec_lower.get("num_car") or ""
        situacao  = rec_lower.get("ind_status") or rec_lower.get("des_condic") or "ATIVO"
        municipio = rec_lower.get("municipio")  or ""
        uf        = rec_lower.get("cod_estado") or "RS"

        if num_car:
            conn.execute(
                "INSERT OR REPLACE INTO sicar VALUES (?,?,?,?,?)",
                (str(num_car).strip(), str(situacao).strip(),
                 "Mata Atlântica", str(municipio).strip(), str(uf).strip())
            )
            total += 1

    conn.commit()
    print(f"  sicar: {total} propriedades importadas do RS.")


# ------------------------------------------------------------------ #
#  PRODES — lê o shapefile real de desmatamento                      #
# ------------------------------------------------------------------ #

def importar_prodes(conn):
    zip_path = os.path.join(PASTA_DADOS, "prodes.zip")
    if not os.path.exists(zip_path):
        print("  prodes.zip nao encontrado, pulando.")
        return

    pasta_prodes = os.path.join(PASTA_DADOS, "prodes_extraido")
    os.makedirs(pasta_prodes, exist_ok=True)
    with zipfile.ZipFile(zip_path, "r") as z:
        z.extractall(pasta_prodes)
    print("  prodes extraido.")

    dbf_path = None
    for raiz, _, arquivos in os.walk(pasta_prodes):
        for arq in arquivos:
            if arq.lower().endswith(".dbf"):
                dbf_path = os.path.join(raiz, arq)
                break

    if dbf_path is None:
        print("  .dbf do PRODES nao encontrado dentro do zip.")
        return

    conn.execute("DELETE FROM prodes")
    total = 0
    tabela = DBF(dbf_path, encoding="latin-1", load=True)
    print(f"  colunas no shapefile PRODES: {tabela.field_names}")

    for rec in tabela:
        rec_lower = {str(k).lower(): v for k, v in rec.items()}
        ano  = rec_lower.get("year") or rec_lower.get("ano") or 0
        area = rec_lower.get("area_km") or rec_lower.get("area") or 0
        uf   = rec_lower.get("state") or "RS"
        
        try:
            ano = int(ano)
        except (ValueError, TypeError):
            ano = 0

        try:
            area_float = float(area)
        except (ValueError, TypeError):
            area_float = 0.0

        if ano >= 2020:
            conn.execute(
                "INSERT INTO prodes VALUES (?,?,?)",
                (str(uf).strip(), ano, area_float)
            )
            total += 1

    conn.commit()
    print(f"  prodes: {total} registros de desmatamento pos-2020 importados.")


# ------------------------------------------------------------------ #
#  IBAMA — Lê todos os arquivos CSV de 1977 a 2026 de uma vez        #
# ------------------------------------------------------------------ #

def importar_ibama(conn):
    print("  Analisando a pasta de dados para o historico do IBAMA...")
    
    # Corrige o limite do tamanho de campo do leitor de CSV para suportar as descrições longas
    csv.field_size_limit(sys.maxsize)
    
    # Filtra todos os arquivos que começam com 'auto_infracao' e terminam com '.csv'
    arquivos_ibama = [
        arq for arq in os.listdir(PASTA_DADOS) 
        if arq.lower().startswith("auto_infracao") and arq.lower().endswith(".csv")
    ]
    
    if not arquivos_ibama:
        print("  Nenhum arquivo auto_infracao_XXXX.csv encontrado na pasta dados, pulando.")
        return

    # Ordena os arquivos por ano
    arquivos_ibama.sort()

    conn.execute("DELETE FROM ibama_multas")
    total_geral = 0

    for arq in arquivos_ibama:
        caminho_arquivo = os.path.join(PASTA_DADOS, arq)
        print(f"  -> Processando arquivo histórico: {arq}")
        
        total_arquivo = 0
        with open(caminho_arquivo, encoding="latin-1") as f:
            reader = csv.DictReader(f, delimiter=";")
            for row in reader:
                row_lower = {str(k).lower(): v for k, v in row.items()}
                
                car_infrator = (
                    row_lower.get("num_car_imovel_rural") or 
                    row_lower.get("cpf_cnpj_infrator") or 
                    row_lower.get("num_auto") or ""
                )
                situacao  = row_lower.get("des_situacao_acao") or "ATIVA"
                descricao = row_lower.get("des_infracao") or ""
                
                if car_infrator:
                    conn.execute(
                        "INSERT INTO ibama_multas VALUES (?,?,?)",
                        (str(car_infrator).strip(), str(situacao).strip(), str(descricao).strip())
                    )
                    total_arquivo += 1
                    total_geral += 1
                    
        print(f"     Concluido: {total_arquivo} multas salvas deste ano.")
                
    conn.commit()
    print(f"\n  [SUCESSO] IBAMA: {total_geral} multas historicas integradas ao banco!")


# ------------------------------------------------------------------ #
#  MAIN                                                              #
# ------------------------------------------------------------------ #

def importar_tudo():
    print(f"\nConectando ao banco: {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)

    print("\n[1] Criando tabelas...")
    criar_tabelas(conn)

    print("\n[2] Importando SICAR (shapefile RS)...")
    importar_sicar(conn)

    print("\n[3] Importando PRODES (shapefile Mata Atlantica)...")
    importar_prodes(conn)

    print("\n[4] Importando Historico IBAMA (Multiplos CSVs)...")
    importar_ibama(conn)

    conn.close()
    print(f"\nBanco pronto e atualizado em: {DB_PATH}")
    print("Agora rode: python coletor.py")

if __name__ == "__main__":
    importar_tudo()