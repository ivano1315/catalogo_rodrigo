import fitz, pytesseract, re, json, os, sys
from PIL import Image
import io

pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
sys.stdout.reconfigure(encoding='utf-8')

PDF_PATH = 'C:/Users/Ivano/Downloads/app rodrigo/Catalogo WAVES PLUS 2026 - WEB - 100dpi web.pdf'
OUT_DIR = 'C:/Users/Ivano/Desktop/CATALOGO/public/imagens'
os.makedirs(OUT_DIR, exist_ok=True)

# Carregar códigos válidos do JSON de produtos
with open('C:/Users/Ivano/Desktop/CATALOGO/lib/dados.json', encoding='utf-8') as f:
    produtos = json.load(f)
codigos_validos = {str(p['cod']) for p in produtos}

doc = fitz.open(PDF_PATH)
mapeamento = {}  # cod -> nome do arquivo

print(f'Processando {len(doc)} páginas...')

for pag_idx in range(len(doc)):
    page = doc[pag_idx]
    imagens_pagina = page.get_images(full=True)

    if not imagens_pagina:
        continue

    # Extrair texto por OCR
    mat = fitz.Matrix(2, 2)
    pix = page.get_pixmap(matrix=mat)
    img_pagina = Image.open(io.BytesIO(pix.tobytes('png')))
    texto_ocr = pytesseract.image_to_string(img_pagina, config='--psm 6')

    # Encontrar códigos numéricos de 4-5 dígitos que existam na tabela
    nums_encontrados = re.findall(r'\b\d{4,5}\b', texto_ocr)
    codigos_pagina = [n for n in nums_encontrados if n in codigos_validos]
    codigos_pagina = list(dict.fromkeys(codigos_pagina))  # deduplica mantendo ordem

    if not codigos_pagina:
        print(f'  Pág {pag_idx+1}: sem códigos reconhecidos')
        continue

    # Filtrar apenas imagens coloridas (ICCBased ou RGB), ignorar máscaras grayscale
    imgs_color = [img for img in imagens_pagina if img[5] != 'DeviceGray']

    if not imgs_color:
        imgs_color = imagens_pagina

    print(f'  Pág {pag_idx+1}: códigos={codigos_pagina} | imagens={len(imgs_color)}')

    # Distribuir imagens pelos códigos encontrados
    imgs_por_cod = max(1, len(imgs_color) // len(codigos_pagina))

    for i, cod in enumerate(codigos_pagina):
        # Pegar a imagem correspondente ao produto nesta página
        idx_img = i * imgs_por_cod
        if idx_img >= len(imgs_color):
            idx_img = len(imgs_color) - 1

        xref = imgs_color[idx_img][0]
        try:
            base_img = doc.extract_image(xref)
            ext = base_img['ext']
            img_bytes = base_img['image']

            nome_arquivo = f'{cod}.{ext}'
            caminho = os.path.join(OUT_DIR, nome_arquivo)
            with open(caminho, 'wb') as f:
                f.write(img_bytes)

            mapeamento[cod] = f'/imagens/{nome_arquivo}'
        except Exception as e:
            print(f'    Erro ao extrair imagem para {cod}: {e}')

# Salvar mapeamento
with open('C:/Users/Ivano/Desktop/CATALOGO/lib/imagens_mapa.json', 'w', encoding='utf-8') as f:
    json.dump(mapeamento, f, ensure_ascii=False, indent=2)

print(f'\nConcluído! {len(mapeamento)} produtos com imagem.')
print('Mapeamento salvo em lib/imagens_mapa.json')
