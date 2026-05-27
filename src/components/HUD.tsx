import React from 'react';

interface HUDProps {
  neuronCount: number;
  spikeRate: number;
  activityRate: number;
  thought: string;
  paused: boolean;
  onPauseToggle: () => void;
  onSpeedChange: (v: number) => void;
  speed: number;
  onSetThought: (t: string) => void;
}

const THOUGHTS = [
  "Silent / Sleeping",
  "Calm / Resting",
  "Alert / Processing",
  "Excited / Active Thought",
  "Hyperactive / Seizure"
];

const HUD = ({ neuronCount, spikeRate, activityRate, thought, paused, onPauseToggle, onSpeedChange, speed, onSetThought }: HUDProps) => (
  <div style={{
    position: 'absolute', top: 20, left: 20, zIndex: 10,
    color: '#c0e8ff', fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    fontSize: 13, lineHeight: 1.8,
    background: 'linear-gradient(135deg, rgba(5,5,20,0.85), rgba(10,20,40,0.75))',
    backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(0,180,255,0.15)',
    borderRadius: 12, padding: '16px 22px',
    boxShadow: '0 0 30px rgba(0,120,255,0.08), inset 0 0 20px rgba(0,180,255,0.03)',
    minWidth: 220,
  }}>
    {/* Título */}
    <div style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: '#4499cc', marginBottom: 10, borderBottom: '1px solid rgba(0,180,255,0.15)', paddingBottom: 8 }}>
      NeuroAction — Simulação
    </div>

    {/* Métricas */}
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span style={{ color: '#668899' }}>Neurônios</span>
      <span style={{ color: '#00ffcc', fontWeight: 600 }}>{neuronCount.toLocaleString()}</span>
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span style={{ color: '#668899' }}>Spikes/s</span>
      <span style={{ color: spikeRate > 50 ? '#ff6633' : '#00ddff', fontWeight: 600 }}>{spikeRate.toFixed(1)}</span>
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span style={{ color: '#668899' }}>Atividade</span>
      <span style={{ color: activityRate > 0.3 ? '#ffaa00' : '#00ffaa', fontWeight: 600 }}>{(activityRate * 100).toFixed(1)}%</span>
    </div>

    {/* Barra de atividade */}
    <div style={{ margin: '10px 0 6px', height: 4, borderRadius: 2, background: 'rgba(0,180,255,0.1)', overflow: 'hidden' }}>
      <div style={{
        height: '100%', borderRadius: 2,
        width: `${Math.min(100, activityRate * 100)}%`,
        background: activityRate > 0.3
          ? 'linear-gradient(90deg, #ffaa00, #ff4433)'
          : 'linear-gradient(90deg, #00ccaa, #00ddff)',
        transition: 'width 0.3s ease',
      }} />
    </div>

    {/* Estado Mental */}
    <div style={{
      margin: '12px 0', padding: '8px 0',
      borderTop: '1px solid rgba(0,180,255,0.15)',
      borderBottom: '1px solid rgba(0,180,255,0.15)',
      textAlign: 'center'
    }}>
      <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: '#4499cc', marginBottom: 4 }}>
        Estado Mental
      </div>
      <div style={{ fontSize: 14, fontWeight: 'bold', color: '#00ffaa', marginBottom: 8 }}>
        {thought}
      </div>
      
      {/* Seletor de Estado */}
      <select 
        onChange={(e) => onSetThought(e.target.value)}
        value="" // Sempre resetado para placeholder, ou poderia ser value={thought} se correspondesse exato
        style={{
          width: '100%', background: 'rgba(0,20,40,0.5)', 
          border: '1px solid rgba(0,180,255,0.3)', borderRadius: 4,
          color: '#00ccff', fontSize: 11, padding: '4px',
          outline: 'none', cursor: 'pointer'
        }}
      >
        <option value="" disabled>➜ Alterar Estado...</option>
        {THOUGHTS.map(t => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
    </div>

    {/* Controles */}
    <div style={{ marginTop: 12, paddingTop: 0 }}>
      <button
        onClick={onPauseToggle}
        style={{
          width: '100%', padding: '6px 0', border: '1px solid rgba(0,180,255,0.25)',
          borderRadius: 6, cursor: 'pointer', fontSize: 12, letterSpacing: 1,
          background: paused ? 'rgba(0,255,170,0.12)' : 'rgba(255,100,50,0.12)',
          color: paused ? '#00ffaa' : '#ff6633',
          transition: 'all 0.2s ease',
        }}
      >
        {paused ? '▶  CONTINUAR' : '❚❚  PAUSAR'}
      </button>

      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: '#668899', fontSize: 11 }}>Vel.</span>
        <input
          type="range" min={0.1} max={3} step={0.01} value={speed}
          onChange={e => onSpeedChange(Number(e.target.value))}
          style={{ flex: 1, accentColor: '#00ddff', height: 3 }}
        />
        <span style={{ color: '#00ddff', fontSize: 12, minWidth: 40, textAlign: 'right' }}>{speed.toFixed(2)}×</span>
      </div>
    </div>
  </div>
);

export default HUD;
