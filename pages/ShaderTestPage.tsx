






import React, { useMemo, useState } from 'react';



import DitherGlowR3F from '../components/shaders/DitherGlowR3F';







const ShaderTestPage: React.FC = () => {







  // Create a static, centered box for testing purposes.



  const boxRect = useMemo(() => {



    const width = 400;



    const height = 200;



    const x = (window.innerWidth - width) / 2;



    const y = (window.innerHeight - height) / 2;



    return { x, y, width, height };



  }, []);







  const glowColor: [number, number, number] = [0.86, 0.15, 0.15];







  const [pixelSize1, setPixelSize1] = useState(16);



  const [pixelSize2, setPixelSize2] = useState(8);



  const [pixelSize3, setPixelSize3] = useState(4);



  const [animate, setAnimate] = useState(true);



  const [glitchAmount, setGlitchAmount] = useState(0.05);







  return (



    <div style={{ background: '#fff', width: '100vw', height: '100vh' }}>



      <DitherGlowR3F 



        glitchAmount={glitchAmount}



        boxRect={boxRect}



        glowColor={glowColor}



        pixelSize1={pixelSize1}



        pixelSize2={pixelSize2}



        pixelSize3={pixelSize3}



        animate={animate}



      />



      <div style={{ position: 'absolute', bottom: '20px', left: '20px', background: 'rgba(0,0,0,0.5)', color: 'white', padding: '10px', borderRadius: '5px', fontFamily: 'sans-serif' }}>



        <div>



          <label>Layer 1 Size: {pixelSize1}</label>



          <input type="range" min="1" max="32" value={pixelSize1} onChange={(e) => setPixelSize1(Number(e.target.value))} />



        </div>



        <div>



          <label>Layer 2 Size: {pixelSize2}</label>



          <input type="range" min="1" max="32" value={pixelSize2} onChange={(e) => setPixelSize2(Number(e.target.value))} />



        </div>



        <div>



          <label>Layer 3 Size: {pixelSize3}</label>



          <input type="range" min="1" max="32" value={pixelSize3} onChange={(e) => setPixelSize3(Number(e.target.value))} />



        </div>



        <div>



          <label>Glitch: {glitchAmount.toFixed(2)}</label>



          <input type="range" min="0" max="0.5" step="0.01" value={glitchAmount} onChange={(e) => setGlitchAmount(Number(e.target.value))} />



        </div>



        <div>



          <label>Animate</label>



          <input type="checkbox" checked={animate} onChange={(e) => setAnimate(e.target.checked)} />



        </div>



      </div>



    </div>



  );



};







export default ShaderTestPage;




