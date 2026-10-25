# Maratón Ambiental RA · Agenda Ambiental UASLP (LOCAL, sin publicar)
MindAR 1.2.5 + A-Frame 1.5. Modo "pasa y juega" (un teléfono). Abrir con un servidor local: `python3 -m http.server` → index.html.
- targets/ancla_maraton.mind ← /workspace/uaslp/ar_maraton/cartel/ancla_maraton.png (1702×2269, 3:4).
- Tablero: assets/tablero_vertical.jpg (tablero.pdf girado 90° en sentido horario). Plano en el ancla: ancho 2.1152, alto 2.7373, posición (0.4295, -0.0490) en unidades del ancho del ancla = ancho completo del cartel 60 cm, 77.6 cm de alto, centrado.
- data/preguntas.json (480 preguntas extraídas de fichas.pptx con tools/extraer_fichas.py; el '*' se quita y se guarda como índice "ok"); data/tablero.json (42 casillas, color/tema verificado por pixel).
- Pared/Mesa/Auto: mismo criterio que ar-ciclo-agua-uaslp (beta>50° = pared). El tablero siempre queda sobre el cartel; en Mesa las fichas se levantan de pie.
- Pruebas: tools/prueba_headless.py (cámara falsa), capturas/.
