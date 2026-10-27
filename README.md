# Barba vs Fumaça (v0.1)

Jogo de luta 2D no estilo Street Fighter, direto no navegador do celular ou do PC.

**Jogar:** https://adrianop99.github.io/barba-vs-fumaca/

## Lutadores
- **Mukira, o Chicote Barbudo:** Especial = chicote de barba trançada de longo alcance, que derruba.
- **Jogador, o Malandro da Fumaça:** Especial = anel de fumaça que atravessa a tela e cega o adversário por um instante.

## Controles
| | Celular | PC (Jogador 1) | PC (Jogador 2) |
|---|---|---|---|
| Andar / pular / agachar | direcional à esquerda | W A S D | Setas |
| Soco | botão Soco | F | J |
| Chute | botão Chute | G | K |
| Especial | botão Especial | H | L |

- **Defender:** segure para trás (agachado defende golpes baixos).
- **Soco forte:** frente + Soco. **Especial alternativo:** ↓ ↘ + Soco.
- **Pausa:** Esc ou P (ou o botão ❚❚). **Som:** M ou o botão 🔊.

No celular, jogue na horizontal. O modo 2 Jogadores precisa de teclado.

Arte dos personagens: enviada pelo autor. Feito por @aiforge.team.

## Lobo Solitário (v0.3)
Sprites recortados da ficha do usuário (`assets/lobo/ficha.png`, `tools/build_lobo.py`). O Yorkshire faz parte das poses.

| Golpe | Teclado / toque | Comando clássico |
|---|---|---|
| Jab / Fierce / Alpha Claw | Soco / →+Soco / Chute | |
| Agachado soco / Low Kick (baixo) | ↓+Soco / ↓+Chute | |
| Alpha Claw Slash (onda azul) | Especial | ↓↘→+Soco ou ↘+Soco |
| Dog Throw → Yorkshire Attack (morde até 3x) | Especial+← | ↓↙←+Chute |
| Alpha Rush (investida, derruba) | Especial+→ | →→+Soco |
| Tail Sweep (rasteira com o cachorro, baixo) | Especial+↓ | ↓↘→+Chute |
| Double Attack | Soco+Chute juntos | |
| Super Lv1 Lobo e seu Amigo (1 barra) | Especial+Soco | ↓↘→+Soco+Chute |
| Super Lv2 Alpha Pack (2 barras) | Especial+Chute | ↓↙←+Soco+Chute |

## v0.4 – correções do Lobo
- Yorkshire separado das poses (tools/dogseg.py): agora é um sprite próprio que segue o lobo, sai no Dog Throw e volta correndo.
- Animação: entre-quadros por tween (wind-up/recuperação, respiração, squash & stretch no pulo/pouso, arco de queda, quique, levantar), fantasmas de transição e rastro na investida.
- Supers refeitos: brilho espectral em camada aditiva (sem caixa retangular), sem o fogo laranja/inimigo do painel.
- Toque: multi-toque por dedo, buffer de ~80 ms para Especial+Soco / Especial+Chute / Soco+Chute, dedo no vão entre dois botões aperta os dois, botão SUPER quando a barra ALPHA enche (tecla R no teclado).
- Espelho: P2 usa camisa vermelha (paleta P2 da ficha).
