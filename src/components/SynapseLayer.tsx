/**
 * SynapseLayer
 *
 * Toda a lógica de renderização das sinapses foi integrada diretamente
 * no BrainScene.tsx para melhor performance com Three.js puro.
 *
 * Este arquivo é mantido como referência da interface SynapseData.
 */

export interface SynapseData {
  from: number;
  to: number;
  active: boolean;
}

export default function SynapseLayer() { return null; }
