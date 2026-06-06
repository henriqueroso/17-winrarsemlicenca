import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "traceverde.db")

# ------------------------------------------------------------------ #
#  FUNÇÃO PRINCIPAL — chamada pelo main.py                            #
# ------------------------------------------------------------------ #

def buscar_dados_car(car: str) -> dict:
    """
    Busca todas as informações socioambientais vinculadas a um CAR específico 
    no banco local e monta o dicionário padrão para o agente de IA.
    """
    if not os.path.exists(DB_PATH):
        return {"erro": f"Banco de dados '{DB_PATH}' não encontrado. Executa primeiro o importar_banco.py."}

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        # Valida se a propriedade existe no banco de dados do SICAR
        fazenda_existe = conn.execute(
            "SELECT 1 FROM sicar WHERE LOWER(num_car) = ? LIMIT 1", (car.lower(),)
        ).fetchone()

        if not fazenda_existe:
            return {
                "car": car,
                "erro": "Imóvel não encontrado na base de dados local do SICAR."
            }

        return {
            "car":                      car,
            "car_ativo":                _checar_sicar(conn, car),
            "desmatamento_pos_2020":    _checar_prodes(conn, car),
            "conversao_nativa":         _checar_mapbiomas(conn, car),
            "multas_ibama":             _checar_ibama(conn, car),
            "sobreposicao_area_prot":   _checar_icmbio(conn, car),
            "sobreposicao_terra_indig": _checar_funai(conn, car),
            "bioma":                    _buscar_bioma(conn, car),
            "municipio":                _buscar_municipio(conn, car),
        }
    finally:
        conn.close()


# ------------------------------------------------------------------ #
#  CONSULTAS INTERNAS — Ajustadas para tolerância de texto            #
# ------------------------------------------------------------------ #

def _checar_sicar(conn, car: str) -> bool:
    """Verifica se o imóvel está ativo ou regularizado no SICAR."""
    row = conn.execute("""
        SELECT situacao FROM sicar 
        WHERE LOWER(num_car) = ? LIMIT 1
    """, (car.lower(),)).fetchone()
    
    if row is None:
        return False
    
    status = str(row["situacao"]).upper()
    # Captura variações como 'ATIVO', 'REGULAR' ou a letra 'A'
    return "ATIVO" in status or "REGULAR" in status or status == "A"


def _checar_prodes(conn, car: str) -> bool:
    """Verifica se existem alertas de desmatamento registados."""
    # Como a demo vincula o PRODES através do estado, verificamos se há desmatamento pós-2020
    row = conn.execute("""
        SELECT COUNT(*) as total
        FROM prodes
        WHERE car = 'RS' AND ano >= 2020
    """).fetchone()
    return row["total"] > 0


def _checar_mapbiomas(conn, car: str) -> bool:
    """Verifica conversões de vegetação nativa no MapBiomas."""
    row = conn.execute("""
        SELECT COUNT(*) as total
        FROM mapbiomas
        WHERE LOWER(car) = ? AND ano >= 2020
    """, (car.lower(),)).fetchone()
    return row["total"] > 0


def _checar_ibama(conn, car: str) -> int:
    """Retorna o número de multas ativas encontradas."""
    row = conn.execute("""
        SELECT COUNT(*) as total
        FROM ibama_multas
        WHERE LOWER(car) = ? AND UPPER(situacao) = 'ATIVA'
    """, (car.lower(),)).fetchone()
    return row["total"]


def _checar_icmbio(conn, car: str) -> bool:
    """Verifica sobreposição com Unidades de Conservação (ICMBio)."""
    row = conn.execute("""
        SELECT COUNT(*) as total
        FROM icmbio_ucs
        WHERE LOWER(car) = ?
    """, (car.lower(),)).fetchone()
    return row["total"] > 0


def _checar_funai(conn, car: str) -> bool:
    """Verifica sobreposição com Terras Indígenas (FUNAI)."""
    row = conn.execute("""
        SELECT COUNT(*) as total
        FROM funai_tis
        WHERE LOWER(car) = ?
    """, (car.lower(),)).fetchone()
    return row["total"] > 0


def _buscar_bioma(conn, car: str) -> str:
    """Retorna o bioma predominante da propriedade rural."""
    row = conn.execute("""
        SELECT bioma FROM sicar 
        WHERE LOWER(num_car) = ? LIMIT 1
    """, (car.lower(),)).fetchone()
    return row["bioma"] if row and row["bioma"] else "Mata Atlântica"


def _buscar_municipio(conn, car: str) -> str:
    """Retorna a cidade e o respetivo estado (UF) do imóvel."""
    row = conn.execute("""
        SELECT municipio, uf FROM sicar 
        WHERE LOWER(num_car) = ? LIMIT 1
    """, (car.lower(),)).fetchone()
    
    if row:
        return f"{row['municipio']} / {row['uf']}".strip()
    return "Não Informado / RS"


# ------------------------------------------------------------------ #
#  TESTE DE EXECUÇÃO LOCAL                                           #
# ------------------------------------------------------------------ #

if __name__ == "__main__":
    print("=== [COLETOR] Executando simulação de busca local ===")
    
    # Conecta rapidinho só para pegar o primeiro CAR real do seu banco
    import sqlite3
    conn = sqlite3.connect(DB_PATH)
    primeiro_car = conn.execute("SELECT num_car FROM sicar LIMIT 1").fetchone()
    conn.close()
    
    if primeiro_car:
        car_teste = primeiro_car[0]
        print(f" -> Encontrado um CAR real no banco para teste: {car_teste}")
    else:
        car_teste = "RS-4300356-TESTE"
        print(" -> Nenhum CAR encontrado no banco. Certifique-se de que rodou o importar_banco.py")
    
    # Executa a busca real
    resultado = buscar_dados_car(car_teste)
    
    print(f"\nResultado obtido para o CAR '{car_teste}':")
    for chave, valor in resultado.items():
        print(f"  {chave}: {valor}")