/**
 * chatbotPitch.js
 *
 * Generates a standalone, self-contained HTML pitch page for the AI chatbot.
 * Dark/modern design — the chatbot is front and center.
 * Includes live AI chat (/api/chat) + full appointment scheduler inline.
 * Saved as a site record and served at /preview/:id just like demo websites.
 */

export function buildChatbotPitchHtml(lead) {
  const bizName    = escHtml(lead.name     || 'Your Business');
  const category   = escHtml(lead.category || 'local business');
  const city       = lead.city ? escHtml(lead.city) : '';
  const phone      = lead.phone ? escHtml(lead.phone) : '';
  const leadId     = lead.id;

  const greeting   = `Hi there! 👋 I'm the AI assistant for ${bizName}. Ask me anything about our services, pricing, or hours — or book an appointment below.`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>AI Chatbot Demo — ${bizName}</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
body{
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
  background:#0f172a;color:#e2e8f0;min-height:100vh;
}

/* ── Header ── */
.site-header{
  display:flex;align-items:center;justify-content:space-between;
  padding:18px 28px;border-bottom:1px solid rgba(255,255,255,.08);
}
.biz-name{font-size:17px;font-weight:700;color:#fff;}
.biz-sub{font-size:12px;color:#64748b;margin-top:2px;}
.demo-pill{
  background:linear-gradient(135deg,#2563eb,#7c3aed);
  color:#fff;padding:5px 14px;border-radius:20px;
  font-size:11px;font-weight:700;letter-spacing:.07em;
}

/* ── Hero ── */
.hero{text-align:center;padding:44px 24px 28px;}
.hero h1{
  font-size:clamp(26px,5vw,40px);font-weight:800;color:#fff;
  line-height:1.18;margin-bottom:12px;
}
.hero h1 .grad{
  background:linear-gradient(135deg,#3b82f6,#8b5cf6);
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;
  background-clip:text;
}
.hero p{color:#94a3b8;font-size:15px;max-width:500px;margin:0 auto 6px;}
.hero .city-tag{color:#3b82f6;font-size:13px;font-weight:500;}

/* ── Chat section ── */
.chat-section{
  display:flex;justify-content:center;padding:0 24px 36px;
}
.chat-box{
  width:100%;max-width:540px;
  background:#1e293b;border-radius:22px;
  border:1px solid rgba(255,255,255,.1);
  overflow:hidden;
  box-shadow:0 30px 80px rgba(0,0,0,.55),0 0 0 1px rgba(59,130,246,.15);
}

/* chat header */
.chat-box-header{
  background:linear-gradient(135deg,#1d4ed8,#2563eb);
  padding:15px 18px;display:flex;align-items:center;gap:12px;
}
.chat-avatar{
  width:38px;height:38px;border-radius:50%;
  background:rgba(255,255,255,.18);
  display:flex;align-items:center;justify-content:center;font-size:18px;
}
.chat-box-title{color:#fff;font-weight:600;font-size:14px;}
.chat-box-sub{color:rgba(255,255,255,.65);font-size:11px;}
.online-indicator{
  margin-left:auto;display:flex;align-items:center;gap:5px;
  font-size:11px;color:rgba(255,255,255,.6);
}
.online-dot{width:7px;height:7px;border-radius:50%;background:#4ade80;box-shadow:0 0 7px #4ade80;}

/* messages area */
#cp-messages{
  height:300px;overflow-y:auto;padding:14px;
  display:flex;flex-direction:column;gap:9px;
  background:#0f172a;
}
.cp-msg{
  max-width:82%;padding:9px 14px;border-radius:18px;
  font-size:14px;line-height:1.45;word-wrap:break-word;
}
.cp-msg.bot{
  background:#1e293b;color:#e2e8f0;align-self:flex-start;
  border-bottom-left-radius:5px;border:1px solid rgba(255,255,255,.07);
}
.cp-msg.user{
  background:linear-gradient(135deg,#1d4ed8,#3b82f6);color:#fff;
  align-self:flex-end;border-bottom-right-radius:5px;
}
.cp-typing{
  align-self:flex-start;background:#1e293b;color:#475569;
  padding:9px 14px;border-radius:18px;border-bottom-left-radius:5px;
  border:1px solid rgba(255,255,255,.07);font-size:14px;
}

/* suggestion chips */
#cp-suggestions{
  padding:9px 14px 5px;display:flex;gap:6px;flex-wrap:wrap;
  background:#0f172a;border-top:1px solid rgba(255,255,255,.05);
}
.cp-sug{
  background:#1e293b;border:1px solid rgba(255,255,255,.1);
  color:#94a3b8;padding:5px 12px;border-radius:20px;
  font-size:12px;cursor:pointer;transition:all .15s;font-family:inherit;
}
.cp-sug:hover{background:#2563eb;border-color:#2563eb;color:#fff;}

/* input row */
#cp-input-row{
  display:flex;gap:8px;padding:12px 14px;
  background:#1e293b;border-top:1px solid rgba(255,255,255,.07);
}
#cp-input{
  flex:1;background:#0f172a;border:1.5px solid rgba(255,255,255,.1);
  border-radius:22px;padding:9px 16px;color:#e2e8f0;
  font-size:13px;font-family:inherit;outline:none;transition:border-color .15s;
}
#cp-input:focus{border-color:#3b82f6;}
#cp-input::placeholder{color:#334155;}
#cp-send{
  background:linear-gradient(135deg,#2563eb,#3b82f6);color:#fff;
  border:none;border-radius:22px;padding:9px 18px;
  font-size:13px;font-weight:600;cursor:pointer;
  font-family:inherit;white-space:nowrap;transition:opacity .15s;
}
#cp-send:hover{opacity:.88;}
#cp-send:disabled{opacity:.4;cursor:not-allowed;}

/* ── Inline scheduler (dark theme) ── */
#cp-scheduler{
  background:#0f172a;border-top:1px solid rgba(255,255,255,.07);
  padding:14px;display:none;flex-direction:column;
}
#cp-scheduler.visible{display:flex;}
.sched-steps{display:flex;margin-bottom:12px;border-radius:10px;overflow:hidden;}
.sched-step{
  flex:1;padding:7px 4px;text-align:center;font-size:11px;font-weight:600;
  color:#475569;background:#1e293b;border-bottom:2px solid #1e293b;
}
.sched-step.active{color:#3b82f6;border-bottom-color:#3b82f6;background:#172033;}
.sched-step.done{color:#60a5fa;border-bottom-color:#1d4ed8;background:#172033;}
.sched-back{font-size:12px;color:#3b82f6;background:none;border:none;cursor:pointer;padding:0 0 8px;font-family:inherit;}
.sched-back:hover{text-decoration:underline;}
.sched-note{font-size:12px;color:#64748b;margin-bottom:10px;}
.sched-month{font-size:10px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.06em;margin-bottom:7px;}
.date-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:5px;margin-bottom:12px;}
.date-btn{
  display:flex;flex-direction:column;align-items:center;padding:6px 2px;
  border-radius:9px;border:1px solid rgba(255,255,255,.08);
  cursor:pointer;background:#1e293b;transition:all .12s;color:#e2e8f0;
}
.date-btn:hover{background:#2563eb;border-color:#2563eb;color:#fff;}
.date-dow{font-size:9px;color:#475569;}
.date-btn:hover .date-dow{color:#93c5fd;}
.date-num{font-size:13px;font-weight:700;}
.time-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:4px;}
.time-btn{
  padding:10px;border-radius:9px;border:1px solid rgba(255,255,255,.08);
  background:#1e293b;cursor:pointer;font-size:13px;font-weight:500;
  color:#e2e8f0;transition:all .12s;font-family:inherit;
}
.time-btn:hover{background:#2563eb;color:#fff;border-color:#2563eb;}
.sched-slot-label{
  background:#172033;border-radius:9px;padding:8px 12px;
  font-size:12px;color:#3b82f6;font-weight:600;margin-bottom:10px;
}
.sched-field{
  width:100%;background:#1e293b;border:1.5px solid rgba(255,255,255,.1);
  border-radius:9px;padding:9px 12px;color:#e2e8f0;
  font-size:13px;font-family:inherit;outline:none;margin-bottom:8px;transition:border-color .15s;
}
.sched-field:focus{border-color:#3b82f6;}
.sched-field::placeholder{color:#334155;}
.sched-textarea{resize:none;height:68px;}
.sched-confirm{
  width:100%;padding:11px;background:linear-gradient(135deg,#2563eb,#3b82f6);
  color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:700;
  cursor:pointer;font-family:inherit;transition:opacity .15s;
}
.sched-confirm:hover{opacity:.88;}
.sched-confirm:disabled{opacity:.45;cursor:not-allowed;}
.sched-err{color:#f87171;font-size:12px;margin-bottom:7px;}
.sched-success{
  background:#052e16;border:1px solid #166534;border-radius:12px;padding:14px;text-align:center;
}
.sched-success-title{color:#4ade80;font-weight:700;font-size:15px;margin-bottom:5px;}
.sched-success-body{color:#86efac;font-size:13px;}
.sched-success-note{color:#166534;font-size:11px;margin-top:6px;}

/* ── Benefits ── */
.benefits{
  display:flex;justify-content:center;gap:16px;
  padding:4px 24px 44px;flex-wrap:wrap;
}
.benefit{
  background:#1e293b;border:1px solid rgba(255,255,255,.07);
  border-radius:16px;padding:22px 18px;max-width:210px;text-align:center;
  transition:border-color .2s;
}
.benefit:hover{border-color:rgba(59,130,246,.35);}
.benefit-icon{font-size:26px;margin-bottom:10px;}
.benefit-title{font-size:14px;font-weight:700;color:#fff;margin-bottom:6px;}
.benefit-desc{font-size:12px;color:#64748b;line-height:1.55;}

/* ── Footer ── */
.pitch-footer{
  text-align:center;padding:20px 24px 40px;
  border-top:1px solid rgba(255,255,255,.06);
  color:#334155;font-size:12px;line-height:1.7;
}
.pitch-footer strong{color:#475569;}

/* scrollbar */
#cp-messages::-webkit-scrollbar{width:4px;}
#cp-messages::-webkit-scrollbar-track{background:transparent;}
#cp-messages::-webkit-scrollbar-thumb{background:#1e293b;border-radius:4px;}
</style>
</head>
<body>

<!-- Header -->
<header class="site-header">
  <div>
    <div class="biz-name">${bizName}</div>
    <div class="biz-sub">${category}${city ? ' · ' + city : ''}</div>
  </div>
  <div class="demo-pill">✦ AI DEMO</div>
</header>

<!-- Hero -->
<section class="hero">
  <h1>Meet Your<br><span class="grad">24/7 AI Assistant</span></h1>
  <p>This chatbot already knows your business — services, hours, pricing, and more. Try it below.</p>
  ${phone ? `<div class="city-tag">📞 ${phone}</div>` : ''}
</section>

<!-- Chat -->
<section class="chat-section">
  <div class="chat-box">

    <div class="chat-box-header">
      <div class="chat-avatar">🤖</div>
      <div>
        <div class="chat-box-title">${bizName} Assistant</div>
        <div class="chat-box-sub">Powered by AI · Responds instantly</div>
      </div>
      <div class="online-indicator">
        <div class="online-dot"></div> Online
      </div>
    </div>

    <div id="cp-messages"></div>

    <div id="cp-suggestions">
      <button class="cp-sug" onclick="cpSend('What services do you offer?', this)">Services</button>
      <button class="cp-sug" onclick="cpSend('What are your hours?', this)">Hours</button>
      <button class="cp-sug" onclick="cpSend('How much does it cost?', this)">Pricing</button>
      <button class="cp-sug" onclick="cpShowScheduler(); this.remove()">📅 Book Appointment</button>
    </div>

    <!-- Inline scheduler -->
    <div id="cp-scheduler">
      <!-- rendered by JS -->
    </div>

    <div id="cp-input-row">
      <input id="cp-input" placeholder="Ask anything…" onkeydown="if(event.key==='Enter')cpSend()" autocomplete="off"/>
      <button id="cp-send" onclick="cpSend()">Send</button>
    </div>

  </div>
</section>

<!-- Benefits -->
<section class="benefits">
  <div class="benefit">
    <div class="benefit-icon">⚡</div>
    <div class="benefit-title">Instant Answers</div>
    <div class="benefit-desc">Responds to customer questions in seconds, any time of day or night</div>
  </div>
  <div class="benefit">
    <div class="benefit-icon">📅</div>
    <div class="benefit-title">Books Appointments</div>
    <div class="benefit-desc">Lets customers schedule visits while you're busy, on a job, or asleep</div>
  </div>
  <div class="benefit">
    <div class="benefit-icon">📞</div>
    <div class="benefit-title">Never Miss a Lead</div>
    <div class="benefit-desc">Captures every inquiry and callback number even when you can't answer the phone</div>
  </div>
  <div class="benefit">
    <div class="benefit-icon">💰</div>
    <div class="benefit-title">More Revenue</div>
    <div class="benefit-desc">Converts website visitors into booked jobs 24/7 without any extra work from you</div>
  </div>
</section>

<!-- Footer -->
<footer class="pitch-footer">
  <strong>This is a personalized demo built for ${bizName}.</strong><br>
  The AI already knows your services, hours, and contact info. Ready to add this to your website in minutes.
</footer>

<script>
(function(){
  var LEAD_ID = ${leadId};
  var SCHED_RE = /schedule|appointment|book|visit|available|come in|when can|open next|come out/i;
  var DAY_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  var MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var TIME_SLOTS = ['8:00 AM','9:00 AM','10:00 AM','11:00 AM','1:00 PM','2:00 PM','3:00 PM','4:00 PM'];

  var msgsEl    = document.getElementById('cp-messages');
  var inputEl   = document.getElementById('cp-input');
  var sendBtn   = document.getElementById('cp-send');
  var sugEl     = document.getElementById('cp-suggestions');
  var schedEl   = document.getElementById('cp-scheduler');

  var apiHistory = [];
  var schedulerShown = false;
  var schedState = { step:'date', date:null, time:null };
  var userMsgCount = 0;
  var callbackShown = false;

  // ── Boot greeting ────────────────────────────────────────────────────────
  addMsg('bot', ${JSON.stringify(greeting)});
  showCallbackCapture();

  // ── Messaging ────────────────────────────────────────────────────────────
  function addMsg(role, text){
    var el = document.createElement('div');
    el.className = 'cp-msg ' + role;
    el.textContent = text;
    msgsEl.appendChild(el);
    msgsEl.scrollTop = msgsEl.scrollHeight;
    return el;
  }

  window.cpSend = async function(forcedText, clickedBtn){
    var text = (forcedText || inputEl.value).trim();
    if(!text || sendBtn.disabled) return;
    if(!forcedText) inputEl.value = '';
    sendBtn.disabled = true;
    if(clickedBtn) clickedBtn.remove(); else sugEl.style.display = 'none';

    addMsg('user', text);
    apiHistory.push({role:'user', content:text});
    userMsgCount++;

    if(SCHED_RE.test(text) && !schedulerShown){
      schedulerShown = true;
      addMsg('bot', "I'd love to help you schedule that! Pick a date and time below:");
      apiHistory.push({role:'assistant', content:"I'd love to help schedule that! Please use the scheduler below."});
      cpShowScheduler();
      sendBtn.disabled = false;
      inputEl.focus();
      return;
    }

    var typing = document.createElement('div');
    typing.className = 'cp-typing'; typing.textContent = '…';
    msgsEl.appendChild(typing); msgsEl.scrollTop = msgsEl.scrollHeight;

    try{
      var res = await fetch('/api/chat',{
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({lead_id:LEAD_ID, messages:apiHistory})
      });
      var text = await res.text(); typing.remove();
      var data; try{ data=JSON.parse(text); }catch(pe){ addMsg('bot','Server error: '+text.slice(0,120)); sendBtn.disabled=false; inputEl.focus(); return; }
      if(!res.ok){ addMsg('bot','Error: '+(data.error||'unknown — status '+res.status)); sendBtn.disabled=false; inputEl.focus(); return; }
      var reply = (data.content || 'Sorry, something went wrong.').split('**').join('').split('*').join('');
      addMsg('bot', reply);
      apiHistory.push({role:'assistant', content:reply});
    } catch(e){
      typing.remove();
      addMsg('bot', 'Network error: '+e.message);
    }
    sendBtn.disabled = false; inputEl.focus();
    // callback card shown on open
  };

  // ── Callback / Lead Capture ───────────────────────────────────────────────
  function showCallbackCapture(){
    callbackShown = true;
    var card = document.createElement('div');
    card.style.cssText = 'background:#1e293b;border:1.5px solid #3b82f6;border-radius:14px;border-bottom-left-radius:4px;padding:14px 16px;align-self:flex-start;max-width:90%;margin-top:6px;';
    card.innerHTML = '<div style="font-size:13px;font-weight:600;color:#e2e8f0;margin-bottom:10px;">📞 Not ready to book? Have us call you.</div>';
    var phoneIn = document.createElement('input');
    phoneIn.placeholder = 'Phone number'; phoneIn.type = 'tel';
    phoneIn.style.cssText = 'width:100%;background:#0f172a;border:1.5px solid #334155;border-radius:8px;padding:8px 12px;font-size:13px;color:#e2e8f0;outline:none;margin-bottom:8px;font-family:inherit;box-sizing:border-box;';
    var nameIn = document.createElement('input');
    nameIn.placeholder = 'Your name'; nameIn.type = 'text';
    nameIn.style.cssText = phoneIn.style.cssText;
    var btn = document.createElement('button');
    btn.textContent = 'Send my info';
    btn.style.cssText = 'background:#2563eb;color:#fff;border:none;border-radius:8px;padding:8px 18px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;width:100%;';
    card.appendChild(nameIn); card.appendChild(phoneIn); card.appendChild(btn);
    msgsEl.appendChild(card); msgsEl.scrollTop = msgsEl.scrollHeight;

    btn.onclick = async function(){
      var name = nameIn.value.trim(); var phone = phoneIn.value.trim();
      if(!name){ nameIn.style.borderColor='#ef4444'; return; }
      btn.disabled = true; btn.textContent = 'Sending…';
      try{
        await fetch('/api/leads/'+LEAD_ID+'/appointments',{
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({name:name, phone:phone, date:'Callback Request', date_iso:'', time:'', notes:'Requested a callback — not ready to book yet.'})
        });
        card.innerHTML = '<div style="font-size:13px;font-weight:600;color:#4ade80;">Got it! Someone will reach out to you shortly.</div>';
        addMsg('bot', 'Perfect — we have your info and will give you a call soon!');
      } catch(e){
        btn.disabled = false; btn.textContent = 'Send my info';
      }
    };
  }

  // ── Scheduler ────────────────────────────────────────────────────────────
  function getAvailableDates(){
    var dates=[]; var today=new Date(); today.setHours(0,0,0,0);
    var cur=new Date(today); cur.setDate(cur.getDate()+1);
    var end=new Date(today); end.setDate(end.getDate()+21);
    while(cur<=end){ if(cur.getDay()!==0&&cur.getDay()!==6) dates.push(new Date(cur)); cur.setDate(cur.getDate()+1); }
    return dates;
  }
  function friendlyDate(d){ return d.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'}); }
  function isoDate(d){ return d.toISOString().split('T')[0]; }
  function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  window.cpShowScheduler = function(){
    schedulerShown = true;
    schedState = {step:'date', date:null, time:null};
    schedEl.classList.add('visible');
    renderSched();
    schedEl.scrollIntoView({behavior:'smooth', block:'nearest'});
  };

  function renderSched(){
    schedEl.innerHTML = '';

    if(schedState.step === 'success'){
      var s = document.createElement('div'); s.className = 'sched-success';
      s.innerHTML = '<div class="sched-success-title">✅ Appointment Booked!</div>'+
        '<div class="sched-success-body"><strong>'+esc(schedState.name)+'</strong><br>'+
        esc(friendlyDate(schedState.date))+' · '+esc(schedState.time)+'</div>'+
        (schedState.notes ? '<div style="font-size:12px;color:#4ade80;margin-top:5px">📋 '+esc(schedState.notes)+'</div>' : '')+
        '<div class="sched-success-note">Someone will be in touch to confirm!</div>';
      schedEl.appendChild(s);
      addMsg('bot','✅ Booked! ' + schedState.name + ' — ' + friendlyDate(schedState.date) + ' at ' + schedState.time + '. Someone will be in touch to confirm!');
      apiHistory.push({role:'assistant', content:'Appointment confirmed for '+schedState.name+' on '+friendlyDate(schedState.date)+' at '+schedState.time+'.'});
      return;
    }

    // Step bar
    var stepKeys=['date','time','details'];
    var stepLabels=['Date','Time','Details'];
    var prog = document.createElement('div'); prog.className='sched-steps';
    stepKeys.forEach(function(k,i){
      var d=document.createElement('div'); d.className='sched-step';
      var cur=stepKeys.indexOf(schedState.step);
      if(i===cur) d.classList.add('active'); else if(i<cur) d.classList.add('done');
      d.textContent=(i+1)+'. '+stepLabels[i];
      prog.appendChild(d);
    });
    schedEl.appendChild(prog);

    if(schedState.step==='date') renderDateStep();
    else if(schedState.step==='time') renderTimeStep();
    else renderDetailsStep();
  }

  function renderDateStep(){
    var note=el('p','sched-note','Pick an available date (Mon – Fri):');
    schedEl.appendChild(note);
    var dates=getAvailableDates();
    var months={};
    dates.forEach(function(d){
      var k=d.getFullYear()+'-'+d.getMonth();
      if(!months[k]) months[k]={label:MONTH_NAMES[d.getMonth()]+' '+d.getFullYear(),days:[]};
      months[k].days.push(d);
    });
    Object.values(months).forEach(function(m){
      schedEl.appendChild(el('div','sched-month',m.label));
      var grid=el('div','date-grid');
      m.days.forEach(function(d){
        var btn=document.createElement('button'); btn.className='date-btn';
        btn.innerHTML='<span class="date-dow">'+DAY_SHORT[d.getDay()]+'</span><span class="date-num">'+d.getDate()+'</span>';
        btn.onclick=function(){ schedState.date=d; schedState.step='time'; renderSched(); };
        grid.appendChild(btn);
      });
      schedEl.appendChild(grid);
    });
  }

  function renderTimeStep(){
    var back=document.createElement('button'); back.className='sched-back'; back.textContent='← Change date';
    back.onclick=function(){ schedState.step='date'; renderSched(); };
    schedEl.appendChild(back);
    schedEl.appendChild(el('div','sched-note',friendlyDate(schedState.date)+' — select a time:'));
    var grid=el('div','time-grid');
    TIME_SLOTS.forEach(function(t){
      var btn=document.createElement('button'); btn.className='time-btn'; btn.textContent=t;
      btn.onclick=function(){ schedState.time=t; schedState.step='details'; renderSched(); };
      grid.appendChild(btn);
    });
    schedEl.appendChild(grid);
  }

  function renderDetailsStep(){
    var back=document.createElement('button'); back.className='sched-back'; back.textContent='← Change time';
    back.onclick=function(){ schedState.step='time'; renderSched(); };
    schedEl.appendChild(back);

    var slotLabel=el('div','sched-slot-label','📅 '+schedState.date.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})+' · '+schedState.time);
    schedEl.appendChild(slotLabel);

    var nameInput=input('text','Your name *'); var phoneInput=input('tel','Phone number');
    var notesTA=document.createElement('textarea'); notesTA.className='sched-field sched-textarea'; notesTA.placeholder='What do you need help with? (e.g. AC not cooling, inspection, new install…)';
    var errEl=el('div','sched-err');
    var btn=document.createElement('button'); btn.className='sched-confirm'; btn.textContent='Confirm Appointment';

    btn.onclick=async function(){
      var name=nameInput.value.trim();
      if(!name){ errEl.textContent='Please enter your name.'; return; }
      errEl.textContent=''; btn.disabled=true; btn.textContent='Booking…';
      try{
        var res=await fetch('/api/leads/'+LEAD_ID+'/appointments',{
          method:'POST', headers:{'Content-Type':'application/json'},
          body:JSON.stringify({name:name, phone:phoneInput.value.trim(), date:friendlyDate(schedState.date), date_iso:isoDate(schedState.date), time:schedState.time, notes:notesTA.value.trim()})
        });
        if(!res.ok) throw new Error('failed');
        schedState.name=name; schedState.notes=notesTA.value.trim(); schedState.step='success';
        renderSched();
      }catch(e){
        errEl.textContent='Something went wrong. Please try again.';
        btn.disabled=false; btn.textContent='Confirm Appointment';
      }
    };

    schedEl.appendChild(nameInput); schedEl.appendChild(phoneInput);
    schedEl.appendChild(notesTA); schedEl.appendChild(errEl); schedEl.appendChild(btn);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  function el(tag, cls, text){
    var e=document.createElement(tag); e.className=cls||'';
    if(text!==undefined) e.textContent=text;
    return e;
  }
  function input(type, placeholder){
    var e=document.createElement('input'); e.type=type; e.placeholder=placeholder;
    e.className='sched-field'; return e;
  }
})();
</script>
</body>
</html>`;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
