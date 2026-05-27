/**
 * NeuronLayer
 *
 * Toda a lógica de renderização dos neurônios foi integrada diretamente
 * no BrainScene.tsx para melhor performance com Three.js puro.
 *
 * Este arquivo é mantido como referência da interface NeuronData.
 */

export interface NeuronData {
  id: number;
  membranePotential: number;
  threshold: number;
  restingPotential: number;
  fired: boolean;
  position: [number, number, number];
}

export default function NeuronLayer() { return null; }
