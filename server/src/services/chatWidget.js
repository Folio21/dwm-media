/**
 * chatWidget.js
 *
 * Self-contained floating chat + appointment-booking widget injected into
 * every generated demo site. Makes API calls back to the same server
 * (relative URLs), so it works automatically in local preview mode.
 *
 * Features:
 *   - Live AI chat powered by /api/chat
 *   - Inline appointment scheduler (date → time → name/phone/notes → confirm)
 *   - Saves appointments to /api/leads/:id/appointments
 */

export function buildChatWidgetHtml(leadId, businessContext = {}) {
  const bizName  = businessContext.name  || '';
  const bizType  = businessContext.type  || '';
  const bizPhone = businessContext.phone || '';
  return `
<!-- ═══════════════════  AI CHAT + BOOKING WIDGET  ═══════════════════ -->
<style>
/* ── Bubble ── */
#lcw-bubble {
  position:fixed;bottom:24px;right:24px;z-index:99999;
  width:58px;height:58px;border-radius:50%;
  background:linear-gradient(135deg,#2563eb,#1d4ed8);
  color:#fff;font-size:24px;border:none;cursor:pointer;
  box-shadow:0 4px 20px rgba(37,99,235,.45);
  display:flex;align-items:center;justify-content:center;
  transition:transform .15s,box-shadow .15s;
}
#lcw-bubble:hover{transform:scale(1.09);box-shadow:0 6px 28px rgba(37,99,235,.55);}

/* ── Panel ── */
#lcw-panel{
  position:fixed;bottom:96px;right:24px;z-index:99999;
  width:350px;max-height:540px;
  background:#fff;border-radius:18px;
  box-shadow:0 8px 40px rgba(0,0,0,.18);
  display:none;flex-direction:column;overflow:hidden;
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
  font-size:14px;
  animation:lcwUp .2s ease;
}
@keyframes lcwUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
#lcw-panel.open{display:flex;}

/* ── Header ── */
#lcw-header{
  background:linear-gradient(135deg,#2563eb,#1d4ed8);
  color:#fff;padding:14px 16px;flex-shrink:0;position:relative;
}
.lcw-htitle{font-size:15px;font-weight:600;}
.lcw-hsub{font-size:12px;opacity:.8;margin-top:2px;}
.lcw-close{
  position:absolute;top:10px;right:12px;
  background:none;border:none;color:rgba(255,255,255,.7);
  font-size:20px;cursor:pointer;line-height:1;padding:2px 8px;
}
.lcw-close:hover{color:#fff;}

/* ── Tabs ── */
#lcw-tabs{display:flex;border-bottom:1px solid #e9edf2;flex-shrink:0;background:#f8fafc;}
.lcw-tab{
  flex:1;padding:9px 4px;text-align:center;font-size:12px;font-weight:500;
  border:none;background:none;cursor:pointer;color:#64748b;
  border-bottom:2px solid transparent;transition:all .15s;
}
.lcw-tab.active{color:#2563eb;border-bottom-color:#2563eb;background:#fff;}

/* ── Messages ── */
#lcw-messages{
  flex:1;overflow-y:auto;padding:12px;
  display:flex;flex-direction:column;gap:9px;
  background:#f8fafc;min-height:160px;max-height:300px;
}
.lcw-msg{max-width:84%;padding:9px 13px;border-radius:18px;line-height:1.45;word-wrap:break-word;}
.lcw-msg.bot{background:#fff;color:#1e293b;align-self:flex-start;border-bottom-left-radius:5px;box-shadow:0 1px 4px rgba(0,0,0,.06);border:1px solid #f1f5f9;}
.lcw-msg.user{background:#2563eb;color:#fff;align-self:flex-end;border-bottom-right-radius:5px;}
.lcw-typing{align-self:flex-start;background:#fff;color:#94a3b8;padding:9px 14px;border-radius:18px;border-bottom-left-radius:5px;box-shadow:0 1px 4px rgba(0,0,0,.06);}

/* ── Chat input ── */
#lcw-chat-input-row{display:flex;gap:8px;padding:10px 12px;border-top:1px solid #e9edf2;flex-shrink:0;background:#fff;}
#lcw-input{flex:1;border:1.5px solid #cbd5e1;border-radius:22px;padding:8px 14px;font-size:13px;outline:none;font-family:inherit;transition:border-color .15s;}
#lcw-input:focus{border-color:#2563eb;}
#lcw-send{background:#2563eb;color:#fff;border:none;border-radius:22px;padding:8px 16px;font-size:13px;cursor:pointer;font-family:inherit;white-space:nowrap;}
#lcw-send:hover{background:#1d4ed8;}
#lcw-send:disabled{opacity:.5;cursor:not-allowed;}
#lcw-book-btn{
  margin:0 12px 10px;padding:9px;border-radius:10px;
  background:#eff6ff;border:1.5px solid #bfdbfe;color:#1d4ed8;
  font-size:13px;font-weight:500;cursor:pointer;text-align:center;
  transition:background .15s;
}
#lcw-book-btn:hover{background:#dbeafe;}

/* ── Scheduler ── */
#lcw-scheduler{flex:1;overflow-y:auto;padding:12px;display:none;flex-direction:column;background:#f8fafc;}
#lcw-scheduler.visible{display:flex;}
.lcw-steps{display:flex;margin-bottom:12px;}
.lcw-step{flex:1;padding:6px 4px;text-align:center;font-size:11px;font-weight:500;color:#94a3b8;border-bottom:2px solid #e2e8f0;}
.lcw-step.active{color:#2563eb;border-bottom-color:#2563eb;background:#eff6ff;}
.lcw-step.done{color:#3b82f6;border-bottom-color:#93c5fd;background:#f0f9ff;}
.lcw-back{font-size:12px;color:#2563eb;background:none;border:none;cursor:pointer;padding:0 0 8px;display:block;}
.lcw-back:hover{text-decoration:underline;}
.lcw-label{font-size:11px;color:#64748b;margin-bottom:5px;display:block;}
.lcw-month-title{font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px;}
.lcw-date-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:5px;margin-bottom:12px;}
.lcw-date-btn{
  display:flex;flex-direction:column;align-items:center;
  padding:6px 2px;border-radius:8px;border:1px solid #e2e8f0;
  cursor:pointer;background:#fff;transition:all .12s;
}
.lcw-date-btn:hover{background:#2563eb;color:#fff;border-color:#2563eb;}
.lcw-date-dow{font-size:10px;color:#94a3b8;}
.lcw-date-btn:hover .lcw-date-dow{color:#bfdbfe;}
.lcw-date-num{font-size:13px;font-weight:600;}
.lcw-time-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:4px;}
.lcw-time-btn{padding:10px;border-radius:8px;border:1px solid #e2e8f0;background:#fff;cursor:pointer;font-size:13px;font-weight:500;transition:all .12s;}
.lcw-time-btn:hover{background:#2563eb;color:#fff;border-color:#2563eb;}
.lcw-field{width:100%;border:1.5px solid #e2e8f0;border-radius:8px;padding:8px 12px;font-size:13px;font-family:inherit;outline:none;box-sizing:border-box;margin-bottom:8px;transition:border-color .15s;}
.lcw-field:focus{border-color:#2563eb;}
.lcw-textarea{resize:none;height:70px;}
.lcw-confirm-btn{
  width:100%;padding:10px;background:#2563eb;color:#fff;border:none;
  border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;transition:background .15s;
}
.lcw-confirm-btn:hover{background:#1d4ed8;}
.lcw-confirm-btn:disabled{opacity:.5;cursor:not-allowed;}
.lcw-selected-slot{background:#eff6ff;border-radius:8px;padding:7px 12px;font-size:12px;color:#1d4ed8;font-weight:500;margin-bottom:10px;}
.lcw-success{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:14px;text-align:center;}
.lcw-success-title{color:#16a34a;font-weight:700;font-size:15px;margin-bottom:4px;}
.lcw-success-body{color:#15803d;font-size:13px;}
.lcw-success-note{color:#4ade80;font-size:11px;margin-top:6px;}
.lcw-err{color:#ef4444;font-size:12px;margin-bottom:6px;}
.lcw-callback{background:#fff;border:1.5px solid #bfdbfe;border-radius:14px;border-bottom-left-radius:4px;padding:12px 14px;align-self:flex-start;max-width:90%;margin-top:4px;}
.lcw-callback-title{font-size:12px;font-weight:600;color:#1e293b;margin-bottom:8px;}
.lcw-callback-row{display:flex;gap:6px;margin-top:6px;}
.lcw-callback input{flex:1;border:1.5px solid #e2e8f0;border-radius:8px;padding:6px 10px;font-size:12px;font-family:inherit;outline:none;}
.lcw-callback input:focus{border-color:#2563eb;}
.lcw-callback-btn{background:#2563eb;color:#fff;border:none;border-radius:8px;padding:6px 12px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;}
.lcw-callback-btn:hover{background:#1d4ed8;}
.lcw-callback-done{font-size:12px;color:#16a34a;font-weight:600;margin-top:4px;}

/* ── Footer ── */
#lcw-footer{text-align:center;font-size:10px;color:#cbd5e1;padding:5px 0 8px;flex-shrink:0;background:#fff;}
</style>

<button id="lcw-bubble" onclick="lcwToggle()" title="Chat or book appointment">💬</button>

<div id="lcw-panel">
  <div id="lcw-header" style="position:relative">
    <div class="lcw-htitle">AI Assistant</div>
    <div class="lcw-hsub">Ask questions or book an appointment instantly</div>
    <button class="lcw-close" onclick="lcwToggle()">×</button>
  </div>

  <div id="lcw-tabs">
    <button class="lcw-tab active" id="lcw-tab-chat" onclick="lcwShowTab('chat')">💬 Chat</button>
    <button class="lcw-tab" id="lcw-tab-book" onclick="lcwShowTab('book')">📅 Book Appointment</button>
  </div>

  <!-- CHAT TAB -->
  <div id="lcw-messages"></div>
  <div id="lcw-book-btn-wrapper" style="display:none">
    <button id="lcw-book-btn" onclick="lcwShowTab('book')">📅 Schedule an Appointment</button>
  </div>
  <div id="lcw-chat-input-row">
    <input id="lcw-input" placeholder="Ask us anything…" onkeydown="if(event.key==='Enter')lcwSend()" autocomplete="off"/>
    <button id="lcw-send" onclick="lcwSend()">Send</button>
  </div>

  <!-- BOOK TAB -->
  <div id="lcw-scheduler">
    <!-- steps, date, time, details, success rendered by JS -->
  </div>

  <div id="lcw-footer">Powered by AI · Books 24/7</div>
</div>

<script>
(function(){
  var LEAD_ID   = ${leadId};
  var BIZ_NAME  = ${JSON.stringify(bizName)};
  var BIZ_TYPE  = ${JSON.stringify(bizType)};
  var BIZ_PHONE = ${JSON.stringify(bizPhone)};
  var APPT_URL  = LEAD_ID ? '/api/leads/'+LEAD_ID+'/appointments' : '/api/appointments';
  var DAY_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  var MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var TIME_SLOTS = ['8:00 AM','9:00 AM','10:00 AM','11:00 AM','1:00 PM','2:00 PM','3:00 PM','4:00 PM'];
  var SCHED_RE = /schedule|appointment|book|visit|available|come in|service call|when can|open next|come out/i;

  var panel = document.getElementById('lcw-panel');
  var msgsEl = document.getElementById('lcw-messages');
  var inputEl = document.getElementById('lcw-input');
  var sendBtn = document.getElementById('lcw-send');
  var schedEl = document.getElementById('lcw-scheduler');
  var bookBtnWrapper = document.getElementById('lcw-book-btn-wrapper');
  var opened = false;
  var apiHistory = [];
  var schedulerShown = false;
  var userMsgCount = 0;
  var callbackShown = false;

  // ── Dates ────────────────────────────────────────────────────────────────
  function getAvailableDates(){
    var dates=[]; var today=new Date(); today.setHours(0,0,0,0);
    var cur=new Date(today); cur.setDate(cur.getDate()+1);
    var end=new Date(today); end.setDate(end.getDate()+21);
    while(cur<=end){ if(cur.getDay()!==0&&cur.getDay()!==6) dates.push(new Date(cur)); cur.setDate(cur.getDate()+1); }
    return dates;
  }
  function isoDate(d){ return d.toISOString().split('T')[0]; }
  function friendlyDate(d){ return d.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'}); }

  // ── Toggle ───────────────────────────────────────────────────────────────
  window.lcwToggle=function(){
    opened=!opened;
    panel.classList.toggle('open',opened);
    if(opened&&msgsEl.children.length===0) addMsg('bot','Hi there! 👋 How can I help you today? Ask about our services, pricing, or book an appointment below.');
    if(opened) setTimeout(function(){inputEl.focus();},60);
  };

  // ── Tab switching ─────────────────────────────────────────────────────────
  window.lcwShowTab=function(tab){
    var isChat=tab==='chat';
    document.getElementById('lcw-tab-chat').classList.toggle('active',isChat);
    document.getElementById('lcw-tab-book').classList.toggle('active',!isChat);
    msgsEl.style.display=isChat?'flex':'none';
    bookBtnWrapper.style.display='none';
    document.getElementById('lcw-chat-input-row').style.display=isChat?'flex':'none';
    if(isChat){ schedEl.classList.remove('visible'); }
    else { schedEl.classList.add('visible'); if(!schedEl.dataset.built) buildScheduler(); }
  };

  // ── Chat ─────────────────────────────────────────────────────────────────
  function addMsg(role,text){
    var el=document.createElement('div');
    el.className='lcw-msg '+role;
    el.textContent=text;
    msgsEl.appendChild(el);
    msgsEl.scrollTop=msgsEl.scrollHeight;
    return el;
  }

  window.lcwSend=async function(){
    var text=inputEl.value.trim();
    if(!text||sendBtn.disabled) return;
    inputEl.value=''; sendBtn.disabled=true;
    addMsg('user',text);
    apiHistory.push({role:'user',content:text});
    userMsgCount++;

    // Scheduling intent → switch to book tab
    if(SCHED_RE.test(text)&&!schedulerShown){
      schedulerShown=true;
      addMsg('bot',"Sure! Click the 📅 Book Appointment tab to pick a date and time that works for you.");
      sendBtn.disabled=false;
      bookBtnWrapper.style.display='block';
      apiHistory.push({role:'assistant',content:"Sure! Use the Book Appointment tab to schedule."});
      return;
    }

    var typing=document.createElement('div');
    typing.className='lcw-typing'; typing.textContent='…';
    msgsEl.appendChild(typing); msgsEl.scrollTop=msgsEl.scrollHeight;

    try{
      var res=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({lead_id:LEAD_ID,biz_name:BIZ_NAME,biz_type:BIZ_TYPE,biz_phone:BIZ_PHONE,messages:apiHistory})});
      var data=await res.json(); typing.remove();
      var reply=data.content||'Sorry, I could not respond right now.';
      addMsg('bot',reply);
      apiHistory.push({role:'assistant',content:reply});
    }catch(e){
      typing.remove(); addMsg('bot','Oops, something went wrong. Please try again!');
    }
    sendBtn.disabled=false; inputEl.focus();
    // Auto-show Book button if bot's reply mentions scheduling/booking
    if(!schedulerShown && /\b(book|schedul|appointment|calendar|pick a (date|time)|available)\b/i.test(reply)){
      bookBtnWrapper.style.display='block';
    }
    // Callback capture: only show late in convo when user signals they're wrapping up
    var isWrappingUp = /\b(thanks|thank you|okay|ok|got it|bye|goodbye|that.?s all|no thank|not (right )?now|i.?m (good|set)|sounds good|perfect)\b/i.test(text);
    if(userMsgCount>=5 && isWrappingUp && !callbackShown && !schedulerShown){ showCallbackCapture(); }
  };

  // ── Callback / Lead Capture ───────────────────────────────────────────────
  function showCallbackCapture(){
    callbackShown=true;
    var card=document.createElement('div'); card.className='lcw-callback';
    card.innerHTML='<div class="lcw-callback-title">📞 Not ready to book? Have us call you.</div>';
    var nameIn=document.createElement('input'); nameIn.placeholder='Your name'; nameIn.type='text';
    var phoneIn=document.createElement('input'); phoneIn.placeholder='Phone number'; phoneIn.type='tel';
    var btn=document.createElement('button'); btn.className='lcw-callback-btn'; btn.textContent='Send my info';
    var row=document.createElement('div'); row.className='lcw-callback-row';
    row.appendChild(nameIn); row.appendChild(btn);
    card.appendChild(phoneIn); card.appendChild(row);
    msgsEl.appendChild(card); msgsEl.scrollTop=msgsEl.scrollHeight;

    btn.onclick=async function(){
      var name=nameIn.value.trim(); var phone=phoneIn.value.trim();
      if(!name){ nameIn.style.borderColor='#ef4444'; return; }
      btn.disabled=true; btn.textContent='Sending…';
      try{
        await fetch(APPT_URL,{
          method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({name:name,phone:phone,date:'Callback Request',date_iso:'',time:'',notes:'Requested a callback — not ready to book yet.'})
        });
        card.innerHTML='<div class="lcw-callback-done">Got it! Someone will reach out to you shortly.</div>';
        addMsg('bot','Perfect — we have your info and will give you a call soon!');
      }catch(e){
        btn.disabled=false; btn.textContent='Send my info';
      }
    };
  }

  // ── Scheduler ────────────────────────────────────────────────────────────
  var schedState={step:'date',date:null,time:null};

  function buildScheduler(){
    schedEl.dataset.built='1';
    renderSchedStep();
  }

  function renderSchedStep(){
    schedEl.innerHTML='';

    if(schedState.step==='success'){
      var s=document.createElement('div'); s.className='lcw-success';
      s.innerHTML='<div class="lcw-success-title">✅ Appointment Booked!</div>'+
        '<div class="lcw-success-body"><strong>'+escHtml(schedState.name)+'</strong><br>'+
        escHtml(friendlyDate(schedState.date))+' · '+escHtml(schedState.time)+'</div>'+
        (schedState.notes?'<div style="font-size:12px;color:#4ade80;margin-top:6px">📋 '+escHtml(schedState.notes)+'</div>':'')+
        '<div class="lcw-success-note">Someone will be in touch to confirm!</div>';
      schedEl.appendChild(s);
      return;
    }

    // Step progress
    var steps=['Date','Time','Details'];
    var stepKeys=['date','time','details'];
    var prog=document.createElement('div'); prog.className='lcw-steps';
    stepKeys.forEach(function(k,i){
      var d=document.createElement('div'); d.className='lcw-step';
      var cur=stepKeys.indexOf(schedState.step);
      if(i===cur) d.classList.add('active'); else if(i<cur) d.classList.add('done');
      d.textContent=(i+1)+'. '+steps[i];
      prog.appendChild(d);
    });
    schedEl.appendChild(prog);

    if(schedState.step==='date') renderDateStep();
    else if(schedState.step==='time') renderTimeStep();
    else renderDetailsStep();
  }

  function renderDateStep(){
    var dates=getAvailableDates();
    // Group by month
    var months={};
    dates.forEach(function(d){
      var k=d.getFullYear()+'-'+d.getMonth();
      if(!months[k]) months[k]={label:MONTH_NAMES[d.getMonth()]+' '+d.getFullYear(),days:[]};
      months[k].days.push(d);
    });
    var note=document.createElement('p'); note.style.cssText='font-size:12px;color:#64748b;margin-bottom:10px;';
    note.textContent='Pick an available date (Mon – Fri):';
    schedEl.appendChild(note);
    Object.values(months).forEach(function(m){
      var title=document.createElement('div'); title.className='lcw-month-title'; title.textContent=m.label;
      schedEl.appendChild(title);
      var grid=document.createElement('div'); grid.className='lcw-date-grid';
      m.days.forEach(function(d){
        var btn=document.createElement('button'); btn.className='lcw-date-btn';
        btn.innerHTML='<span class="lcw-date-dow">'+DAY_SHORT[d.getDay()]+'</span><span class="lcw-date-num">'+d.getDate()+'</span>';
        btn.onclick=function(){ schedState.date=d; schedState.step='time'; renderSchedStep(); };
        grid.appendChild(btn);
      });
      schedEl.appendChild(grid);
    });
  }

  function renderTimeStep(){
    var back=document.createElement('button'); back.className='lcw-back'; back.textContent='← Change date';
    back.onclick=function(){ schedState.step='date'; renderSchedStep(); };
    schedEl.appendChild(back);
    var heading=document.createElement('div'); heading.style.cssText='font-weight:600;margin-bottom:3px;';
    heading.textContent=friendlyDate(schedState.date);
    schedEl.appendChild(heading);
    var sub=document.createElement('div'); sub.style.cssText='font-size:12px;color:#64748b;margin-bottom:10px;';
    sub.textContent='Select a time slot:';
    schedEl.appendChild(sub);
    var grid=document.createElement('div'); grid.className='lcw-time-grid';
    TIME_SLOTS.forEach(function(t){
      var btn=document.createElement('button'); btn.className='lcw-time-btn'; btn.textContent=t;
      btn.onclick=function(){ schedState.time=t; schedState.step='details'; renderSchedStep(); };
      grid.appendChild(btn);
    });
    schedEl.appendChild(grid);
  }

  function renderDetailsStep(){
    var back=document.createElement('button'); back.className='lcw-back'; back.textContent='← Change time';
    back.onclick=function(){ schedState.step='time'; renderSchedStep(); };
    schedEl.appendChild(back);

    var slot=document.createElement('div'); slot.className='lcw-selected-slot';
    slot.textContent='📅 '+schedState.date.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})+' · '+schedState.time;
    schedEl.appendChild(slot);

    var nameInput=document.createElement('input'); nameInput.className='lcw-field'; nameInput.placeholder='Your name *'; nameInput.type='text';
    var phoneInput=document.createElement('input'); phoneInput.className='lcw-field'; phoneInput.placeholder='Phone number'; phoneInput.type='tel';
    var notesInput=document.createElement('textarea'); notesInput.className='lcw-field lcw-textarea'; notesInput.placeholder='What do you need help with? (e.g. AC not cooling, inspection, installation…)';

    var errEl=document.createElement('div'); errEl.className='lcw-err';

    var confirmBtn=document.createElement('button'); confirmBtn.className='lcw-confirm-btn'; confirmBtn.textContent='Confirm Appointment';
    confirmBtn.onclick=async function(){
      var name=nameInput.value.trim();
      if(!name){ errEl.textContent='Please enter your name.'; return; }
      errEl.textContent='';
      confirmBtn.disabled=true; confirmBtn.textContent='Booking…';
      try{
        var res=await fetch(APPT_URL,{
          method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({name:name,phone:phoneInput.value.trim(),date:friendlyDate(schedState.date),date_iso:isoDate(schedState.date),time:schedState.time,notes:notesInput.value.trim()})
        });
        if(!res.ok) throw new Error('Request failed');
        schedState.name=name; schedState.notes=notesInput.value.trim(); schedState.step='success';
        renderSchedStep();
        // Also drop a confirmation message in the chat
        addMsg('bot','✅ Booked! '+name+' — '+friendlyDate(schedState.date)+' at '+schedState.time+'. Someone will be in touch to confirm!');
        apiHistory.push({role:'assistant',content:'Appointment booked for '+name+' on '+friendlyDate(schedState.date)+' at '+schedState.time+'.'});
      }catch(e){
        errEl.textContent='Something went wrong. Please try again.';
        confirmBtn.disabled=false; confirmBtn.textContent='Confirm Appointment';
      }
    };

    schedEl.appendChild(nameInput);
    schedEl.appendChild(phoneInput);
    schedEl.appendChild(notesInput);
    schedEl.appendChild(errEl);
    schedEl.appendChild(confirmBtn);
  }

  function escHtml(s){
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
})();
</script>
<!-- ════════════════════════════════════════════════════════════════════ -->
`;
}
