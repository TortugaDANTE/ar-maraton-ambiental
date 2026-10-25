import asyncio,re
from playwright.async_api import async_playwright
U='http://localhost:8765/index.html';O='capturas/'
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(args=['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--use-file-for-fake-video-capture=/tmp/fake.y4m','--use-gl=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required'])
  pg=await b.new_page(viewport={'width':390,'height':780})
  logs=[];pg.on('console',lambda m:logs.append(m.text));pg.on('pageerror',lambda e:logs.append('ERR '+str(e)))
  await pg.goto(U);await pg.wait_for_timeout(1600)
  await pg.screenshot(path=O+'01_intro.png');await pg.click('#bRegistro');await pg.wait_for_timeout(1500)
  for n in ['Ana','Luis','Equipo Verde']:
   await pg.fill('#iNombre',n);await pg.click('#bFoto');await pg.wait_for_timeout(300)
  await pg.screenshot(path=O+'02_registro.png')
  await pg.evaluate("document.querySelector('#target').addEventListener('targetFound',()=>window.__found=1)")
  await pg.click('#bAR')
  try: await pg.wait_for_function('window.__found',timeout=40000);print('TARGET FOUND')
  except Exception as e: print('no target',e)
  await pg.wait_for_timeout(2500);await pg.screenshot(path=O+'03_ar_tablero.png')
  # turno: dado + respuesta incorrecta
  await pg.wait_for_function("__S.fase==='dado'");await pg.click('#bDado');await pg.wait_for_selector('#pregunta:not(.oculto)',timeout=8000)
  await pg.screenshot(path=O+'04_pregunta.png')
  ok=await pg.evaluate("(()=>{const t=document.querySelector('#pTexto').textContent;const q=PREG.find(q=>q.p===t);return [...document.querySelectorAll('#pOps button')].findIndex(b=>b.textContent.slice(3)===q.op[q.ok])})()")
  bad=(ok+1)%3;await pg.click(f'#pOps button >> nth={bad}');await pg.wait_for_timeout(1500);await pg.screenshot(path=O+'05_incorrecta.png')
  print('tras fallo',await pg.evaluate("[__S.jug.map(j=>j.km),__S.ign,__S.turno]"))
  # forzar llegada: jugador en turno a km 41
  await pg.wait_for_function("__S.fase==='dado'",timeout=10000)
  await pg.evaluate("__S.jug[__S.turno].km=41;moverFichas()")
  await pg.click('#bDado');await pg.wait_for_selector('#pregunta:not(.oculto)',timeout=8000)
  ok=await pg.evaluate("(()=>{const t=document.querySelector('#pTexto').textContent;const q=PREG.find(q=>q.p===t);return [...document.querySelectorAll('#pOps button')].findIndex(b=>b.textContent.slice(3)===q.op[q.ok])})()")
  await pg.click(f'#pOps button >> nth={ok}');await pg.wait_for_selector('#final:not(.oculto)',timeout=8000);await pg.wait_for_timeout(800)
  await pg.screenshot(path=O+'06_ranking.png')
  # prueba de tiempo agotado (t=3s) en nueva partida 2D
  await pg.goto(U);await pg.wait_for_timeout(1500);await pg.click('#bRegistro');await pg.wait_for_timeout(800)
  for n in ['A','B']: await pg.fill('#iNombre',n);await pg.click('#bFoto')
  await pg.click('#bSinCam');await pg.evaluate("__S.t=3;arrancarReloj()");await pg.wait_for_timeout(4200)
  print('timeout ->',await pg.evaluate("[__S.ign,__S.turno,__S.fallosT]"));await pg.screenshot(path=O+'07_sin_camara_timeout.png')
  print('\n'.join(l for l in logs if 'ERR' in l or 'rror' in l)[:1500])
  await b.close()
asyncio.run(main())
