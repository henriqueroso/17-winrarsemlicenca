import os
import urllib.request
import ssl  # Biblioteca adicionada para contornar o problema do certificado
from urllib.error import HTTPError, URLError

# Pasta onde os arquivos vao ser salvos
PASTA_DADOS = os.path.join(os.path.dirname(__file__), "dados")
os.makedirs(PASTA_DADOS, exist_ok=True)

def baixar_arquivo(url: str, nome_arquivo: str):
    destino = os.path.join(PASTA_DADOS, nome_arquivo)
    if os.path.exists(destino):
        print(f"  ja existe, pulando: {nome_arquivo}")
        return destino
    print(f"  baixando: {nome_arquivo} ...")
    
    # Cria um contexto que desabilita a verificacao estrita do certificado SSL do governo
    contexto_ssl = ssl._create_unverified_context()
    
    try:
        # Passamos o contexto criado para a funcao urlopen
        with urllib.request.urlopen(url, timeout=90, context=contexto_ssl) as r:
            with open(destino, "wb") as f:
                while True:
                    chunk = r.read(8192)
                    if not chunk:
                        break
                    f.write(chunk)
    except HTTPError as e:
        print(f"  Erro HTTP ao baixar {nome_arquivo}: {e}")
        raise
    except URLError as e:
        print(f"  Erro de Rede/URL ao baixar {nome_arquivo}: {e}")
        raise
    print(f"  salvo: {nome_arquivo}")
    return destino

def baixar_tudo():
    # -------------------------------------------------------- #
    # IBAMA — CSV de multas (dados abertos, download direto)   #
    # -------------------------------------------------------- #
    print("\n[1/3] IBAMA - multas ambientais")
    baixar_arquivo(
        "https://dadosabertos.ibama.gov.br/dados/FISCALIZACAO/auto_infracao/auto_infracao.csv",
        "ibama_multas.csv"
    )

    # -------------------------------------------------------- #
    # SICAR — instrucoes manuais (nao tem download direto)     #
    # -------------------------------------------------------- #
    print("\n[2/3] SICAR - shapefile")
    print("  ATENCAO: o SICAR nao tem download automatico.")
    print("  Acesse manualmente: https://car.gov.br/publico/imoveis/index")
    print("  Escolha o estado, clique em Shapefile e salve como:")
    print(f"  {os.path.join(PASTA_DADOS, 'sicar_RS.zip')}")

    # -------------------------------------------------------- #
    # PRODES — instrucoes manuais                              #
    # -------------------------------------------------------- #
    print("\n[3/3] PRODES - shapefile de desmatamento")
    print("  ATENCAO: baixe manualmente em:")
    print("  https://terrabrasilis.dpi.inpe.br/downloads/")
    print("  Escolha: PRODES > Mata Atlantica (ou seu bioma)...")

if __name__ == "__main__":
    baixar_tudo()