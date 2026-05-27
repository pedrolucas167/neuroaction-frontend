import React from 'react';
import BrainScene from '../components/BrainScene';

const Home = () => {
  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body, #__next { width: 100%; height: 100%; overflow: hidden; background: #050510; }
      `}</style>
      <BrainScene />
    </>
  );
};

export default Home;
