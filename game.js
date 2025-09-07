    // ======= تنظیمات بازی =======
    const CFG = {
        player:{
          radius: 26,
          speed: 7.2,         // سرعت افقی
          colorA: '#00e5ff',
          colorB: '#7c4dff'
        },
        star:{
          minSpeed: 2.2,
          maxSpeed: 6.5,
          minR: 10,
          maxR: 18
        },
        bomb:{
          chance: 0.22,       // احتمال بمب
          color: '#ff4d6d'
        },
        heart:{
          chance: 0.08,       // احتمال قلب
          color: '#2ee6a6'
        },
        spawn:{
          baseEvery: 650,     // هر چند میلی‌ثانیه یک آبجکت
          accelEach: 9000,    // هر n ms سرعت سختی بیشتر
          accelFactor: 0.92
        },
        lives: 3
      }
  
      // ======= متغیرهای اصلی =======
      const canvas = document.getElementById('game');
      const ctx = canvas.getContext('2d');
      const stage = document.getElementById('stage');
      const overlay = document.getElementById('overlay');
      const startBtn = document.getElementById('start-btn');
      const resumeBtn = document.getElementById('resume-btn');
      const restartBtn = document.getElementById('restart-btn');
      const leftCtl = document.getElementById('left-ctl');
      const rightCtl = document.getElementById('right-ctl');
      const pauseCtl = document.getElementById('pause-ctl');
  
      const scoreEl = document.getElementById('score');
      const livesEl = document.getElementById('lives');
      const timeEl = document.getElementById('time');
      const panelTitle = document.getElementById('panel-title');
      const panelSub = document.getElementById('panel-sub');
      const finalStats = document.getElementById('final-stats');
  
      let W = canvas.width, H = canvas.height;
      let running = false, paused = false, over = false;
      let keys = { left:false, right:false }
      let touch = { left:false, right:false }
  
      // ======= حالات بازی =======
      const game = {
        score: 0,
        lives: CFG.lives,
        startTime: 0,
        lastTime: 0,
        elapsed: 0,
        spawnEvery: CFG.spawn.baseEvery,
        lastSpawn: 0,
        objects: [],
        player: { x: W/2, y: H-80, r: CFG.player.radius, vx: 0 }
      }
  
      function resetGame(){
        game.score = 0;
        game.lives = CFG.lives;
        game.elapsed = 0;
        game.startTime = performance.now();
        game.lastTime = game.startTime;
        game.spawnEvery = CFG.spawn.baseEvery;
        game.lastSpawn = 0;
        game.objects = [];
        game.player.x = W/2; game.player.y = H-80; game.player.vx = 0;
        updateHUD();
        over = false; paused = false;
      }
  
      function updateHUD(){
        scoreEl.textContent = game.score;
        livesEl.textContent = game.lives;
        timeEl.textContent = Math.floor(game.elapsed/1000)+'s';
      }
  
      // ======= رویدادها =======
      window.addEventListener('resize', onResize);
      function onResize(){
        // canvas رزولوشن ثابت دارد، فقط نمایش ظاهری تغییر می‌کند
        // نیازی به تغییر ابعاد نیست. اما می‌تونیم نسبت را نگه داریم اگر لازم شد.
      }
      document.addEventListener('keydown', e=>{
        if(e.key==='ArrowLeft'){ keys.left = true; e.preventDefault(); }
        if(e.key==='ArrowRight'){ keys.right = true; e.preventDefault(); }
        if((e.key==='p'||e.key==='Escape') && running){ togglePause(); }
        if((e.key===' '||e.key==='Enter') && !running){ startGame(); }
      });
      document.addEventListener('keyup', e=>{
        if(e.key==='ArrowLeft'){ keys.left = false; }
        if(e.key==='ArrowRight'){ keys.right = false; }
      });
  
      // Touch Buttons
      const press = el => el.classList.add('active');
      const release = el => el.classList.remove('active');
      leftCtl.addEventListener('touchstart', e=>{ e.preventDefault(); touch.left = true; press(leftCtl) }, {passive:false});
      leftCtl.addEventListener('touchend', e=>{ e.preventDefault(); touch.left = false; release(leftCtl) }, {passive:false});
      rightCtl.addEventListener('touchstart', e=>{ e.preventDefault(); touch.right = true; press(rightCtl) }, {passive:false});
      rightCtl.addEventListener('touchend', e=>{ e.preventDefault(); touch.right = false; release(rightCtl) }, {passive:false});
      pauseCtl.addEventListener('click', togglePause);
  
      startBtn.addEventListener('click', startGame);
      resumeBtn.addEventListener('click', togglePause);
      restartBtn.addEventListener('click', ()=>{ startGame(true) });
  
      function showOverlay(mode){
        overlay.classList.remove('hidden');
        if(mode==='start'){
          panelTitle.textContent = 'آماده‌ای؟';
          panelSub.style.display='block';
          finalStats.style.display='none';
          startBtn.style.display='inline-block';
          resumeBtn.style.display='none';
          restartBtn.style.display='none';
        }else if(mode==='pause'){
          panelTitle.textContent = 'توقف موقت';
          panelSub.style.display='block';
          finalStats.style.display='none';
          startBtn.style.display='none';
          resumeBtn.style.display='inline-block';
          restartBtn.style.display='inline-block';
        }else if(mode==='over'){
          panelTitle.textContent = 'پایان بازی';
          panelSub.style.display='none';
          finalStats.style.display='block';
          startBtn.style.display='none';
          resumeBtn.style.display='none';
          restartBtn.style.display='inline-block';
        }
      }
      function hideOverlay(){ overlay.classList.add('hidden') }
  
      function startGame(isRestart=false){
        resetGame();
        hideOverlay();
        running = true; paused = false; over = false;
        if(!isRestart){ /* first time */ }
        gameLoop(performance.now());
      }
  
      function togglePause(){
        if(!running || over) return;
        paused = !paused;
        if(paused){
          showOverlay('pause');
        }else{
          hideOverlay();
          // ادامه حلقه
          game.lastTime = performance.now();
          gameLoop(game.lastTime);
        }
      }
  
      // ======= کمک‌ها =======
      const rand = (min,max)=> Math.random()*(max-min)+min;
      function spawnObject(){
        const roll = Math.random();
        const isBomb = roll < CFG.bomb.chance;
        const isHeart = !isBomb && roll < (CFG.bomb.chance + CFG.heart.chance);
        const r = isHeart ? 14 : rand(CFG.star.minR, CFG.star.maxR);
        const speed = rand(CFG.star.minSpeed, CFG.star.maxSpeed) * (1 + game.elapsed/60000); // سخت‌تر شدن تدریجی
        const x = rand(20, W-20);
        const y = -20;
        game.objects.push({ x, y, r, vy: speed, type: isBomb ? 'bomb' : (isHeart ? 'heart' : 'star') });
      }
  
      function circleHit(ax,ay,ar, bx,by,br){
        const dx = ax-bx, dy = ay-by; const r = ar+br;
        return dx*dx + dy*dy <= r*r;
      }
  
      // ======= رندر و منطق =======
      function drawBackground(t){
        // ستاره‌های ریز پس‌زمینه
        ctx.clearRect(0,0,W,H);
        const g = ctx.createLinearGradient(0,0,0,H);
        g.addColorStop(0,'#0b0f24'); g.addColorStop(1,'#0a0d24');
        ctx.fillStyle = g;
        ctx.fillRect(0,0,W,H);
  
        // هاله‌های نرم
        const grd = ctx.createRadialGradient(W*0.2, 120, 10, W*0.2, 120, 260);
        grd.addColorStop(0,'rgba(124,77,255,0.25)');
        grd.addColorStop(1,'rgba(124,77,255,0)');
        ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(W*0.2,120,260,0,Math.PI*2); ctx.fill();
  
        const grd2 = ctx.createRadialGradient(W*0.8, 80, 10, W*0.8, 80, 220);
        grd2.addColorStop(0,'rgba(0,229,255,0.25)');
        grd2.addColorStop(1,'rgba(0,229,255,0)');
        ctx.fillStyle = grd2; ctx.beginPath(); ctx.arc(W*0.8,80,220,0,Math.PI*2); ctx.fill();
      }
  
      function drawPlayer(p, t){
        // دایره براق با گرادیان
        const grad = ctx.createRadialGradient(p.x-10, p.y-10, 8, p.x, p.y, p.r+8);
        grad.addColorStop(0, CFG.player.colorA);
        grad.addColorStop(1, CFG.player.colorB);
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill();
  
        // ریلایت کوچک
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.beginPath(); ctx.arc(p.x-8, p.y-10, 5, 0, Math.PI*2); ctx.fill();
      }
  
      function drawObject(o){
        if(o.type==='star'){
          // ستاره پنج‌پر ساده
          ctx.save();
          ctx.translate(o.x, o.y);
          ctx.rotate((performance.now()/500) % (Math.PI*2));
          ctx.fillStyle = '#d0f5ff';
          ctx.beginPath();
          const spikes=5, outer=o.r, inner=o.r*0.5;
          for(let i=0;i<spikes*2;i++){
            const ang = i*Math.PI/spikes;
            const rad = i%2===0 ? outer : inner;
            ctx.lineTo(Math.cos(ang)*rad, Math.sin(ang)*rad);
          }
          ctx.closePath(); ctx.fill();
          ctx.restore();
        }else if(o.type==='bomb'){
          // بمب
          ctx.fillStyle = CFG.bomb.color;
          ctx.beginPath(); ctx.arc(o.x,o.y,o.r,0,Math.PI*2); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.8)';
          ctx.beginPath(); ctx.arc(o.x-4,o.y-5,o.r*0.25,0,Math.PI*2); ctx.fill();
        }else{ // heart
          drawHeart(o.x, o.y, o.r*1.2, CFG.heart.color);
        }
      }
  
      function drawHeart(x,y,size,color){
        const s = size;
        ctx.save();
        ctx.translate(x,y);
        ctx.rotate(-0.1);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, s*0.35);
        ctx.bezierCurveTo(-s, -s*0.4, -s*0.2, -s*0.95, 0, -s*0.45);
        ctx.bezierCurveTo(s*0.2, -s*0.95, s, -s*0.4, 0, s*0.35);
        ctx.fill();
        ctx.restore();
      }
  
      function gameLoop(now){
        if(!running) return;
        if(paused){ return; }
        const dt = now - game.lastTime;
        game.lastTime = now;
        game.elapsed = now - game.startTime;
  
        update(dt);
        render(now);
  
        if(!over) requestAnimationFrame(gameLoop);
      }
  
      function update(dt){
        // حرکت بازیکن
        const speed = CFG.player.speed * (keys.left || keys.right ? 1 : 0.98);
        if(keys.left || touch.left){ game.player.vx = -speed; }
        else if(keys.right || touch.right){ game.player.vx = speed; }
        else { game.player.vx *= 0.85; if(Math.abs(game.player.vx) < 0.1) game.player.vx = 0; }
  
        game.player.x += game.player.vx * (dt/16);
        game.player.x = Math.max(game.player.r+6, Math.min(W - game.player.r - 6, game.player.x));
  
        // اسپاون آبجکت‌ها
        game.lastSpawn += dt;
        if(game.lastSpawn >= game.spawnEvery){
          game.lastSpawn = 0;
          spawnObject();
          // سخت‌تر شدن با زمان
          if(game.elapsed % CFG.spawn.accelEach < 30){
            game.spawnEvery *= CFG.spawn.accelFactor;
            game.spawnEvery = Math.max(250, game.spawnEvery);
          }
        }
  
        // آپدیت آبجکت‌ها و برخورد
        for(let i=game.objects.length-1;i>=0;i--){
          const o = game.objects[i];
          o.y += o.vy * (dt/16);
  
          if(circleHit(game.player.x, game.player.y, game.player.r, o.x, o.y, o.r)){
            if(o.type==='star'){
              game.score += 10;
            }else if(o.type==='heart'){
              game.lives = Math.min(CFG.lives, game.lives+1);
            }else{ // bomb
              game.lives -= 1;
              // فلش قرمز کوتاه
              flashScreen('rgba(255,77,109,0.25)');
            }
            game.objects.splice(i,1);
            updateHUD();
            if(game.lives<=0){ endGame(); return; }
            continue;
          }
  
          // از پایین خارج شد
          if(o.y - o.r > H){
            // ستاره‌ی از دست‌رفته امتیاز نمی‌گیرد؛ بمبِ رد‌شده پاداش کوچیک بده؟
            if(o.type==='bomb'){ game.score += 2; updateHUD(); }
            game.objects.splice(i,1);
          }
        }
      }
  
      function render(t){
        drawBackground(t);
        // ذرات ریز:
        ctx.save();
        ctx.globalAlpha = 0.5;
        for(let i=0;i<40;i++){
          const y = (t/30 + i*150) % (H+60) - 60;
          const x = (i*97)%W;
          ctx.fillStyle = 'rgba(255,255,255,0.15)';
          ctx.fillRect(x, y, 2, 2);
        }
        ctx.restore();
  
        // آبجکت‌ها
        for(const o of game.objects) drawObject(o);
  
        // بازیکن
        drawPlayer(game.player, t);
      }
  
      function flashScreen(color){
        // چشمک خیلی کوتاه در کانواس
        ctx.save();
        ctx.fillStyle = color;
        ctx.fillRect(0,0,W,H);
        ctx.restore();
      }
  
      function endGame(){
        over = true; running = false;
        finalStats.style.display='block';
        finalStats.innerHTML = `
          <span class="badge">امتیاز: ${game.score}</span>
          &nbsp;&nbsp;
          <span class="badge bad">مدت زمان: ${Math.floor(game.elapsed/1000)}s</span>
        `;
        showOverlay('over');
      }
  
      // شروع صفحه
      showOverlay('start');
  
      // جلوگیری از اسکرول هنگام تاچ روی کنترل‌ها
      ['touchstart','touchmove','touchend'].forEach(ev=>{
        stage.addEventListener(ev, e=>{
          if(e.target.closest('.controls')) e.preventDefault();
        }, {passive:false});
      });
  
      // کیفیت رندر تیزتر در نمایش‌های HiDPI
      (function fixHiDPI(){
        const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
        const cssW = canvas.clientWidth;
        const cssH = canvas.clientHeight;
        // اگر اندازه‌ها صفر باشند (قبل از layout)، بعداً انجام می‌شود.
        const resizeCanvas = ()=>{
          const rect = canvas.getBoundingClientRect();
          const w = Math.round(rect.width * dpr);
          const h = Math.round(rect.height * dpr);
          if(!w || !h) return;
          canvas.width = w; canvas.height = h;
          W = w; H = h;
          // موقعیت بازیکن نسبت به ارتفاع جدید:
          game.player.y = H - 80;
        }
        // در بارگذاری و تغییر اندازه:
        new ResizeObserver(resizeCanvas).observe(stage);
        resizeCanvas();
      })();