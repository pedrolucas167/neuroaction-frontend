# NeuroAction Frontend

Interface web em Next.js para visualizar uma simulação neural 3D com neurônios, sinapses e painel de controle.

## Tecnologias
- Next.js
- React
- TypeScript
- Three.js
- @react-three/fiber
- @react-three/drei

## Pré-requisitos
- Node.js instalado
- Backend em execução em `http://localhost:8080`

## Instalação
```bash
npm install
```

## Desenvolvimento
```bash
npm run dev
```

## Build
```bash
npm run build
```

## Observações
- A tela principal fica em `src/pages/index.tsx`.
- A cena 3D e os controles ficam em `src/components/BrainScene.tsx`.
- O HUD está em `src/components/HUD.tsx`.
- O frontend consome os endpoints:
  - `GET http://localhost:8080/brain/state`
  - `GET/POST http://localhost:8080/brain/thought`

## Autoria
Pedro Lucas Ramos de Oliveira Marques

## Licença
Apache-2.0

