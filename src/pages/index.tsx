import BrainScene from '../components/BrainScene';

const Home = () => {
  return (
    <div>
      <style jsx global>{`
        body {
          margin: 0;
          overflow: hidden;
        }
      `}</style>
      <BrainScene />
    </div>
  );
};

export default Home;
