
// ---
// CONFIG - Vervang deze twee waarden met je eigen Supabase gegevens
// ---
// E-mail bevestiging loopt via Supabase // Vervang met jouw Brevo API key
const COORD_EMAIL   = 'antonius.cirkel@gmail.com'; // E-mail van de coördinator

const SUPABASE_URL  = 'https://rtdqgaphhjrwcetrtxtc.supabase.co';
const SUPABASE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0ZHFnYXBoaGpyd2NldHJ0eHRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2ODMwMzksImV4cCI6MjA5MjI1OTAzOX0.g6gotmAaCb2eg3bVfVypHXTD1TFbVnzzWIUt6naJ6eY';

// ---
// DEMO DATA (wordt gebruikt als Supabase niet is ingesteld)
// ---
const DEMO_USER = { name: 'Maria Vermeer', email: 'demo@pci.nl', role: 'coordinator', initials: 'MV' };

const DEMO_TASKS = [
  {
    id: 1, type: 'Ziekenbezoek', description: 'Weduwe, Lindenlaan-buurt',
    date: '2026-03-25', duration: 'Ca. 1 uur', profile: 'Geen speciale kennis',
    urgency: 'urgent', notes: 'Mevrouw woont alleen en stelt bezoek erg op prijs. Bel van tevoren even aan.',
    status: 'open', assigned_to: null,
    private_name: 'Mevr. A. Janssen', private_address: 'Lindenlaan 14', private_phone: '06-11223344'
  },
  {
    id: 2, type: 'Jubileumbezoek', description: 'Echtpaar, 50 jaar getrouwd, centrum',
    date: '2026-03-29', duration: 'Ca. 45 minuten', profile: 'Geen speciale kennis',
    urgency: 'normaal', notes: 'Fijn echtpaar, graag een kaart meenemen van de parochie.',
    status: 'open', assigned_to: null,
    private_name: 'Fam. De Groot', private_address: 'Kerkstraat 8', private_phone: '06-55667788'
  },
  {
    id: 3, type: 'Schuldhulpverlening', description: 'Gezin met jonge kinderen',
    date: '2026-03-26', duration: 'Ca. 2 uur', profile: 'Schuldhulp',
    urgency: 'urgent', notes: 'Gezin heeft dringende hulp nodig bij het ordenen van brieven en begrijpen van betalingsregelingen.',
    status: 'open', assigned_to: null,
    private_name: 'Fam. Bakker', private_address: 'Rozenlaan 22', private_phone: '06-99887766'
  },
  {
    id: 4, type: 'Jubileumbezoek', description: 'Echtpaar, 60 jaar getrouwd, Westbuurt',
    date: '2026-03-23', duration: 'Ca. 1 uur', profile: 'Geen speciale kennis',
    urgency: 'normaal', notes: '',
    status: 'assigned', assigned_to: 'demo@pci.nl',
    private_name: 'Fam. Pietersen', private_address: 'Tulpstraat 5', private_phone: '06-12121212'
  }
];

const DEMO_VOLUNTEERS = [
  { id: 1, name: 'Maria Vermeer', email: 'demo@pci.nl', initials: 'MV', color: 'green',
    task_types: ['Ziekenbezoek','Jubileumbezoek'], days: 'Dinsdag en zaterdag', tasks_done: 7, tasks_active: 1 },
  { id: 2, name: 'Jan Koster', email: 'j.koster@email.nl', initials: 'JK', color: 'blue',
    task_types: ['Schuldhulpverlening','Ziekenbezoek'], days: 'Maandag', tasks_done: 3, tasks_active: 0 },
  { id: 3, name: 'Lies Bosch', email: 'l.bosch@email.nl', initials: 'LB', color: 'amber',
    task_types: ['Jubileumbezoek','Praktische hulp'], days: 'Woensdag en vrijdag', tasks_done: 5, tasks_active: 0 }
];

// ---
// APP STATE
// ---
let supabase = null;
let currentUser = null;
let currentRole = 'volunteer';
let isDemo = false;
let currentTaskId = null;
let demoTasks = [...DEMO_TASKS];

// ---
// INIT
// ---
window.addEventListener('load', () => {
  initCheckboxes();
  if (SUPABASE_URL !== 'JOUW_SUPABASE_URL') {
    loadSupabase(function(ok) {
      if (ok && window.supabase) {
        try {
          supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
            auth: {
              autoRefreshToken: true,
              persistSession: true,
              detectSessionInUrl: true,
              storage: window.localStorage
            }
          });
          checkSession();
        } catch(e) {
          console.error('Supabase init fout:', e);
          showScreen('screen-login');
        }
      } else {
        showScreen('screen-login');
      }
    });
  } else {
    showScreen('screen-login');
  }
});

function checkSession() {
  if (!supabase) { showScreen('screen-login'); return; }

  // Gebruik opgeslagen token van magic link redirect
  var at = sessionStorage.getItem('sb_at');
  var rt = sessionStorage.getItem('sb_rt');
  if (at) {
    sessionStorage.removeItem('sb_at');
    sessionStorage.removeItem('sb_rt');
    supabase.auth.setSession({ access_token: at, refresh_token: rt || at })
      .then(function(result) {
        if (result.data && result.data.session) {
          currentUser = result.data.session.user;
          enterApp();
        } else {
          supabase.auth.getSession().then(function(r) {
            if (r.data && r.data.session) {
              currentUser = r.data.session.user;
              enterApp();
            } else {
              showScreen('screen-login');
            }
          });
        }
      });
    return;
  }

  supabase.auth.onAuthStateChange(function(event, session) {
    if (event === 'SIGNED_IN' && session && !currentUser) {
      currentUser = session.user;
      enterApp();
    }
    if (event === 'SIGNED_OUT') {
      currentUser = null;
      showScreen('screen-login');
    }
  });

  supabase.auth.getSession().then(function(result) {
    if (result.data && result.data.session) {
      currentUser = result.data.session.user;
      enterApp();
    } else {
      showScreen('screen-login');
    }
  });
}

function enterApp() {
  const name = currentUser?.user_metadata?.name || currentUser?.email || 'Gebruiker';
  const initials = name.split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase();
  document.getElementById('nav-avatar').textContent = initials;
  document.getElementById('profile-name').textContent = name;
  document.getElementById('profile-email').textContent = currentUser?.email || '';
  document.getElementById('profile-avatar-lg').textContent = initials;

  // Verberg demo-knop
  const demoBtn = document.querySelector('#screen-login button[onclick="startDemo()"]');
  if (demoBtn) demoBtn.closest('div').style.display = 'none';

  // Haal rol op uit database
  if (isDemo) {
    showScreen('screen-tasks');
    loadTasks();
    loadMyTasks();
    return;
  }

  if (supabase) {
    supabase.from('profiles').select('role').eq('id', currentUser.id).single()
      .then(({ data }) => {
        const role = data?.role || 'volunteer';
        currentRole = role;
        if (role === 'coordinator') {
          document.getElementById('nav-beheer-btn').style.display = '';
          document.getElementById('nav-beheer-btn2').style.display = '';
        } else {
          document.getElementById('nav-beheer-btn').style.display = 'none';
          document.getElementById('nav-beheer-btn2').style.display = 'none';
        }
        checkAvgToestemming();
        showScreen('screen-tasks');
        loadTasks();
        loadMyTasks();
      });
  } else {
    document.getElementById('nav-beheer-btn').style.display = 'none';
    document.getElementById('nav-beheer-btn2').style.display = 'none';
    checkAvgToestemming();
    showScreen('screen-tasks');
    loadTasks();
    loadMyTasks();
  }
}

// ---
// NAVIGATIE
// ---
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0,0);
  // Verberg login scherm altijd als we naar een ander scherm gaan
  if (id !== 'screen-login') {
    const loginScreen = document.getElementById('screen-login');
    loginScreen.style.display = 'none';
  } else {
    document.getElementById('screen-login').style.display = '';
  }
}

function showNavScreen(id, el) {
  showScreen(id);
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (el) el.classList.add('active');
  if (id === 'screen-tasks') loadTasks();
  if (id === 'screen-coord') { loadCoordTasks(); loadCoordVolunteers(); loadAvgCleanup(); }
  if (id === 'screen-profile') loadProfileData();
}

function switchTab(targetId, groupId) {
  const group = document.getElementById(groupId);
  group.querySelectorAll('.tabpanel').forEach(p => p.classList.remove('active'));
  document.getElementById(targetId).classList.add('active');
  const tabs = group.previousElementSibling;
  const idx = Array.from(group.children).findIndex(c => c.id === targetId);
  tabs.querySelectorAll('.tab').forEach((t,i) => t.classList.toggle('active', i === idx));
}

function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// ---
// AUTH
// ---
async function sendOtp() {
  const email = document.getElementById('login-email').value.trim();
  if (!email) { showToast('Voer een e-mailadres in'); return; }
  if (!supabase) { showToast('Supabase niet ingesteld. Gebruik demo-modus.'); return; }
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {}
  });
  if (error) { showToast('Fout: ' + error.message); return; }
  showOtpStep(2);
  showToast('Code verstuurd naar ' + email);
}

function showOtpStep(step) {
  document.getElementById('login-step-1').style.display = step === 1 ? 'block' : 'none';
  document.getElementById('login-step-2').style.display = step === 2 ? 'block' : 'none';
  if (step === 2) setTimeout(() => document.getElementById('login-otp').focus(), 100);
}

async function verifyOtp() {
  const email = document.getElementById('login-email').value.trim();
  const token = document.getElementById('login-otp').value.trim();
  if (!token || token.length < 6) { showToast('Voer de 6-cijferige code in'); return; }
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
  if (error) { showToast('Ongeldige code: ' + error.message); return; }
  if (data && data.session) {
    currentUser = data.session.user;
    enterApp();
  }
}


// ---
// PROFIEL LADEN
// ---
async function loadProfileData() {
  if (!supabase || !currentUser) return;
  const { data, error } = await supabase
    .from('profiles')
    .select('name, phone, days, max_tasks_per_month, task_types')
    .eq('id', currentUser.id)
    .single();
  if (error || !data) return;

  const nameParts = (data.name || '').split(' ');
  document.getElementById('profile-firstname').value = nameParts[0] || '';
  document.getElementById('profile-lastname').value = nameParts.slice(1).join(' ') || '';
  document.getElementById('profile-phone').value = data.phone || '';
  document.getElementById('profile-days').value = data.days || '';

  const maxTasksEl = document.getElementById('profile-max-tasks');
  if (data.max_tasks_per_month) maxTasksEl.value = String(data.max_tasks_per_month);

  const taskTypes = Array.isArray(data.task_types) ? data.task_types : [];
  document.querySelectorAll('#profile-task-types input').forEach(cb => {
    cb.checked = taskTypes.includes(cb.value);
    const label = cb.closest('.checkbox-item');
    if (label) label.classList.toggle('checked', cb.checked);
  });
}
function logout() {
  if (supabase) supabase.auth.signOut();
  currentUser = null; isDemo = false;
  showScreen('screen-login');
}



// ---
// TAKEN LADEN (vrijwilliger)
// ---
async function loadTasks() {
  const el = document.getElementById('tasks-list');
  el.innerHTML = '<div class="loading"><div class="spinner"></div>Taken laden...</div>';

  let tasks = [];
  if (isDemo) {
    tasks = demoTasks.filter(t => t.status === 'open');
  } else {
    const { data, error } = await supabase.from('tasks')
      .select('id,type,description,date,duration,urgency,notes,status')
      .eq('status','open').order('date');
    if (error) { el.innerHTML = '<div class="empty"><p>Taken konden niet worden geladen.</p></div>'; return; }
    tasks = data;
  }

  if (!tasks.length) {
    el.innerHTML = '<div class="empty"><div class="empty-icon">✓</div><p>Geen open taken op dit moment.<br>De coördinator plaatst nieuwe taken zodra die beschikbaar zijn.</p></div>';
    return;
  }
  el.innerHTML = tasks.map(t => taskCard(t)).join('');
}

async function loadMyTasks() {
  const el = document.getElementById('my-tasks-list');
  el.innerHTML = '<div class="loading"><div class="spinner"></div>Laden...</div>';
  let tasks = [];
  if (isDemo) {
    tasks = demoTasks.filter(t => t.assigned_to === DEMO_USER.email && t.status !== 'done');
  } else {
    const { data } = await supabase.from('tasks')
      .select('id,type,description,date,duration,status')
      .eq('assigned_to', currentUser.email)
      .neq('status', 'done')
      .order('date');
    tasks = data || [];
  }
  if (!tasks.length) {
    el.innerHTML = '<div class="empty"><p>Je hebt nog geen taken aangenomen.<br>Kijk bij "Open taken" wat er beschikbaar is.</p></div>';
    return;
  }
  el.innerHTML = tasks.map(t => taskCard(t, true)).join('');
}

function taskCard(t, isMine) {
  const badgeClass = t.urgency === 'urgent' ? 'badge-urgent' :
                     isMine ? 'badge-taken' : 'badge-open';
  const badgeLabel = t.urgency === 'urgent' ? 'Urgent' :
                     isMine ? 'Aangenomen' : 'Open';
  const dateStr = t.date ? new Date(t.date).toLocaleDateString('nl-NL',{day:'numeric',month:'long'}) : '-';
  return `
    <div class="card card-clickable" onclick="openTaskDetail('${t.id}')" style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
        <div>
          <div style="font-size:12px;color:var(--clr-text-muted);margin-bottom:2px">${t.type}</div>
          <div style="font-size:15px;font-weight:500">${t.description}</div>
          <div style="font-size:13px;color:var(--clr-text-muted);margin-top:3px">${dateStr} &bull; ${t.duration}</div>
        </div>
        <span class="badge ${badgeClass}">${badgeLabel}</span>
      </div>
      ${t.profile && t.profile !== 'Geen speciale kennis' ?
        `<div class="tag-row"><span class="tag">${t.profile}</span></div>` : ''}
    </div>`;
}

function openTaskDetail(id) {
  const task = isDemo ? demoTasks.find(t => t.id === id) : null;
  currentTaskId = id;
  if (!task && !isDemo) { loadTaskFromDB(id); return; }

  document.getElementById('detail-type').textContent = task.type;
  document.getElementById('detail-name').textContent = task.description;
  document.getElementById('detail-date').textContent =
    new Date(task.date).toLocaleDateString('nl-NL',{weekday:'long',day:'numeric',month:'long'});
  document.getElementById('detail-duration').textContent = task.duration;
  document.getElementById('detail-notes').textContent = task.notes || 'Geen verdere toelichting.';

  const badge = document.getElementById('detail-badge');
  badge.className = 'badge ' + (task.urgency === 'urgent' ? 'badge-urgent' : 'badge-open');
  badge.textContent = task.urgency === 'urgent' ? 'Urgent' : 'Open';

  const isMine = task.assigned_to === currentUser?.email || task.assigned_to === DEMO_USER.email;
  document.getElementById('detail-private-section').style.display = isMine ? 'block' : 'none';
  document.getElementById('detail-action-section').style.display = (isMine || currentRole === 'coordinator') ? 'none' : 'block';
  if (isMine) {
    document.getElementById('detail-private-name').textContent = task.private_name;
    document.getElementById('detail-private-address').textContent = task.private_address;
    document.getElementById('detail-private-phone').textContent = task.private_phone;
  }
  showScreen('screen-task-detail');
}

async function loadTaskFromDB(id) {
  const { data } = await supabase.from('tasks').select('*').eq('id',id).single();
  if (!data) { showToast('Taak niet gevonden'); return; }
  const isMine = data.assigned_to === currentUser?.email;
  document.getElementById('detail-type').textContent = data.type;
  document.getElementById('detail-name').textContent = data.description;
  document.getElementById('detail-date').textContent =
    new Date(data.date).toLocaleDateString('nl-NL',{weekday:'long',day:'numeric',month:'long'});
  document.getElementById('detail-duration').textContent = data.duration;
  document.getElementById('detail-notes').textContent = data.notes || '-';
  document.getElementById('detail-private-section').style.display = isMine ? 'block' : 'none';
  document.getElementById('detail-action-section').style.display = (isMine || currentRole === 'coordinator') ? 'none' : 'block';
  if (isMine) {
    document.getElementById('detail-private-name').textContent = data.private_name || '-';
    document.getElementById('detail-private-address').textContent = data.private_address || '-';
    document.getElementById('detail-private-phone').textContent = data.private_phone || '-';
  }
  showScreen('screen-task-detail');
}

// ---
// TAAK AANNEMEN
// ---
async function confirmTask() {
  closeModal('modal-confirm');
  if (isDemo) {
    const t = demoTasks.find(t => t.id === currentTaskId);
    if (t) { t.status = 'assigned'; t.assigned_to = DEMO_USER.email; }
    showToast('Taak aangenomen');
    openTaskDetail(currentTaskId);
    loadTasks(); loadMyTasks();
    return;
  }
  const { data: taskData } = await supabase.from('tasks').select('*').eq('id', currentTaskId).single();
  const { error } = await supabase.from('tasks').update({
    status: 'assigned', assigned_to: currentUser.email, assigned_at: new Date().toISOString()
  }).eq('id', currentTaskId);
  if (error) { showToast('Fout bij aannemen: ' + error.message); return; }

  // Stuur bevestigingsmail via Brevo
  if (taskData) await stuurBevestigingsmail(taskData);

  showToast('Taak aangenomen. Bevestiging verstuurd.');
  loadTaskFromDB(currentTaskId);
  loadTasks(); loadMyTasks();
}

async function stuurBevestigingsmail(task) {
  // E-mail wordt verstuurd via de Supabase database trigger (notify_volunteer_accepted)
}

async function vrijwilligerMarkeerAfgerond(id) {
  if (!confirm('Wil je deze taak als afgerond markeren?')) return;
  if (isDemo) {
    const t = demoTasks.find(t => t.id === id);
    if (t) t.status = 'done';
    showToast('Taak afgerond, coordinator is op de hoogte gesteld');
    showScreen('screen-tasks');
    loadTasks(); loadMyTasks(); return;
  }
  const { error } = await supabase.from('tasks').update({
    status: 'done', completed_at: new Date().toISOString()
  }).eq('id', id);
  if (error) { showToast('Fout: ' + error.message); return; }
  showToast('Taak afgerond, coordinator is op de hoogte gesteld');
  showScreen('screen-tasks');
  loadTasks(); loadMyTasks();
}

async function geefTaakTerug(id) {
  if (!confirm('Wil je deze taak teruggeven? De taak wordt weer open gezet voor andere vrijwilligers.')) return;
  if (isDemo) {
    const t = demoTasks.find(t => t.id === id);
    if (t) { t.status = 'open'; t.assigned_to = null; }
    showToast('Taak teruggegeven');
    showScreen('screen-tasks');
    loadTasks(); loadMyTasks(); return;
  }
  const { error } = await supabase.from('tasks').update({
    status: 'open', assigned_to: null, assigned_at: null
  }).eq('id', id);
  if (error) { showToast('Fout: ' + error.message); return; }
  showToast('Taak teruggegeven');
  showScreen('screen-tasks');
  loadTasks(); loadMyTasks();
}

// ---
// COÖRDINATOR - TAKEN
// ---
async function loadCoordTasks() {
  const el = document.getElementById('coord-tasks-list');
  let tasks = isDemo ? demoTasks.filter(t => t.status !== 'done') : [];
  if (!isDemo) {
    const { data } = await supabase.from('tasks').select('*').neq('status','done').order('date');
    tasks = data || [];
  }
  document.getElementById('coord-stat-open').textContent = tasks.filter(t=>t.status==='open').length;
  if (!tasks.length) { el.innerHTML = '<div class="empty"><p>Nog geen taken aangemaakt.</p></div>'; return; }
  el.innerHTML = tasks.map(t => {
    const dateStr = t.date ? new Date(t.date).toLocaleDateString('nl-NL',{day:'numeric',month:'short'}) : '-';
    const statusLabel = t.status === 'open' ? 'Open' : t.status === 'assigned' ? 'Aangenomen' : 'Afgerond';
    const statusClass = t.status === 'open' ? 'badge-open' : t.status === 'assigned' ? 'badge-taken' : 'badge-done';
    return `
      <div class="card" style="margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
          <div>
            <div style="font-size:12px;color:var(--clr-text-muted)">${t.type} &bull; ${dateStr}</div>
            <div style="font-size:15px;font-weight:500;margin-top:2px">${t.description}</div>
            ${t.assigned_to ? `<div style="font-size:12px;color:var(--clr-accent);margin-top:3px">Aangenomen door: ${t.assigned_to}</div>` : ''}
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end">
            <span class="badge ${statusClass}">${statusLabel}</span>
            ${t.urgency==='urgent' ? '<span class="badge badge-urgent">Urgent</span>' : ''}
          </div>
        </div>
        ${t.status === 'assigned' ?
          `<button class="btn" style="margin-top:10px;padding:8px;font-size:13px" onclick="markDone('${t.id}')">Markeren als afgerond</button>` : ''}
        <div style="display:flex;gap:8px;margin-top:8px">
          <button class="btn" style="flex:1;padding:8px;font-size:13px" onclick="editTask('${t.id}')">Bewerken</button>
          <button class="btn btn-danger" style="flex:1;padding:8px;font-size:13px" onclick="deleteTask('${t.id}')">Verwijderen</button>
        </div>
      </div>`;
  }).join('');
}

async function createTask() {
  const getVal = (id, trim) => { const el = document.getElementById(id); return el ? (trim ? el.value.trim() : el.value) : ''; };
  const type    = getVal('new-task-type');
  const desc    = getVal('new-task-desc', true);
  const date    = getVal('new-task-date');
  const dur     = getVal('new-task-duration');
  const notes   = getVal('new-task-notes', true);
  const profile = type;
  const urgency = getVal('new-task-urgency');
  const pName   = getVal('new-task-private-name', true);
  const pAddr   = getVal('new-task-private-address', true);
  const pPhone  = getVal('new-task-private-phone', true);

  if (!type || !desc || !date) { showToast('Vul type, omschrijving en datum in'); return; }

  const editId = document.getElementById('modal-new-task').dataset.editId;
  const isEdit = !!editId;

  if (isDemo) {
    if (isEdit) {
      const t = demoTasks.find(t => String(t.id) === String(editId));
      if (t) { t.type = type; t.description = desc; t.date = date; t.duration = dur;
               t.notes = notes; t.profile = profile; t.urgency = urgency;
               t.private_name = pName; t.private_address = pAddr; t.private_phone = pPhone; }
    } else {
      demoTasks.unshift({ id: Date.now(), type, description: desc, date, duration: dur,
        profile, urgency, notes, status: 'open', assigned_to: null,
        private_name: pName, private_address: pAddr, private_phone: pPhone });
    }
    resetTaskForm();
    closeModal('modal-new-task');
    showToast(isEdit ? 'Taak bijgewerkt' : 'Taak aangemaakt');
    loadCoordTasks(); return;
  }

  let error;
  if (isEdit) {
    ({ error } = await supabase.from('tasks').update({
      type, description: desc, date, duration: dur, notes, urgency,
      private_name: pName, private_address: pAddr, private_phone: pPhone
    }).eq('id', editId));
  } else {
    ({ error } = await supabase.from('tasks').insert({
      type, description: desc, date, duration: dur, notes, urgency,
      status: 'open', created_by: currentUser.email,
      private_name: pName, private_address: pAddr, private_phone: pPhone
    }));
  }
  if (error) { showToast('Fout: ' + error.message); return; }
  resetTaskForm();
  closeModal('modal-new-task');
  showToast(isEdit ? 'Taak bijgewerkt' : 'Taak aangemaakt');
  loadCoordTasks();
}

function resetTaskForm() {
  document.getElementById('modal-new-task').dataset.editId = '';
  document.querySelector('#modal-new-task .btn-primary').textContent = 'Taak aanmaken';
  ['new-task-type','new-task-desc','new-task-date','new-task-notes',
   'new-task-private-name','new-task-private-address','new-task-private-phone'].forEach(id => {
    document.getElementById(id).value = '';
  });
}

async function deleteTask(id) {
  if (!confirm('Wil je deze taak verwijderen? Afgeronde taken in het archief worden niet verwijderd.')) return;
  if (isDemo) {
    demoTasks = demoTasks.filter(t => t.id !== id);
    showToast('Taak verwijderd'); loadCoordTasks(); return;
  }
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) { showToast('Fout: ' + error.message); return; }
  showToast('Taak verwijderd'); loadCoordTasks();
}

function editTask(id) {
  const task = isDemo ? demoTasks.find(t => t.id === id) : null;
  if (!task && !isDemo) { loadTaskForEdit(id); return; }
  vulEditFormIn(task);
}

async function loadTaskForEdit(id) {
  const { data } = await supabase.from('tasks').select('*').eq('id', id).single();
  if (data) vulEditFormIn(data);
}

function vulEditFormIn(task) {
  document.getElementById('new-task-type').value = task.type || '';
  document.getElementById('new-task-desc').value = task.description || '';
  document.getElementById('new-task-date').value = task.date || '';
  document.getElementById('new-task-duration').value = task.duration || 'Ca. 1 uur';
  document.getElementById('new-task-notes').value = task.notes || '';

  document.getElementById('new-task-urgency').value = task.urgency || 'normaal';
  document.getElementById('new-task-private-name').value = task.private_name || '';
  document.getElementById('new-task-private-address').value = task.private_address || '';
  document.getElementById('new-task-private-phone').value = task.private_phone || '';
  // Sla het id op voor opslaan
  document.getElementById('modal-new-task').dataset.editId = task.id;
  // Verander de knoptekst
  document.querySelector('#modal-new-task .btn-primary').textContent = 'Wijzigingen opslaan';
  openModal('modal-new-task');
}

async function markDone(id) {
  if (isDemo) {
    const t = demoTasks.find(t => t.id === id);
    if (t) t.status = 'done';
    showToast('Taak afgerond'); loadCoordTasks(); return;
  }
  await supabase.from('tasks').update({ status: 'done', completed_at: new Date().toISOString() }).eq('id', id);
  showToast('Taak gemarkeerd als afgerond'); loadCoordTasks();
}

// ---
// COÖRDINATOR - VRIJWILLIGERS
// ---
async function loadCoordVolunteers() {
  const el = document.getElementById('coord-volunteers-list');
  let vols = isDemo ? DEMO_VOLUNTEERS : [];
  let taskStats = {};
  if (!isDemo) {
    const [volsResult, tasksResult] = await Promise.all([
      supabase.rpc('get_all_profiles'),
      supabase.from('tasks').select('assigned_to,status')
    ]);
    vols = volsResult.data || [];
    (tasksResult.data || []).forEach(t => {
      if (!t.assigned_to) return;
      if (!taskStats[t.assigned_to]) taskStats[t.assigned_to] = { done: 0, active: 0 };
      if (t.status === 'done')     taskStats[t.assigned_to].done++;
      if (t.status === 'assigned') taskStats[t.assigned_to].active++;
    });
  }
  document.getElementById('coord-stat-volunteers').textContent = vols.length;
  if (!vols.length) { el.innerHTML = '<div class="empty"><p>Nog geen vrijwilligers in de pool.</p></div>'; return; }
  const colors = ['green','blue','amber','red'];
  el.innerHTML = vols.map((v,i) => {
    const s = taskStats[v.email] || { done: 0, active: 0 };
    return `
    <div class="card" style="margin-bottom:10px">
      <div class="row">
        <div class="avatar av-md av-${v.color || colors[i%4]}">${v.initials || v.name.split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase()}</div>
        <div class="row-info">
          <div class="title">${v.name}</div>
          <div class="sub">${v.email}</div>
          ${v.phone ? `<div class="sub">&#128222; ${v.phone}</div>` : ''}
          <div style="font-size:11px;margin-top:3px">
            <span class="badge ${v.role === 'coordinator' ? 'badge-profile' : 'badge-open'}">${v.role === 'coordinator' ? 'Coordinator' : 'Vrijwilliger'}</span>
          </div>
          <div style="font-size:12px;color:var(--clr-text-muted);margin-top:6px">
            &#10003; ${s.done} afgerond &nbsp;&bull;&nbsp; ${s.active} actief
          </div>
          <div class="tag-row" style="margin-top:5px">
            ${(v.task_types||[]).map(tt=>`<span class="tag">${tt}</span>`).join('')}
          </div>
        </div>
        <button class="btn" style="width:auto;padding:6px 10px;font-size:12px" onclick="wisselRol('${v.id}','${v.role}','${v.email}')">
          ${v.role === 'coordinator' ? 'Vrijwilliger maken' : 'Coordinator maken'}
        </button>
      </div>
    </div>`;
  }).join('');
}

async function wisselRol(id, huidigeRol, email) {
  const nieuweRol = huidigeRol === 'coordinator' ? 'volunteer' : 'coordinator';
  const bevestig = confirm(email + ' wordt ' + (nieuweRol === 'coordinator' ? 'coordinator' : 'vrijwilliger') + '. Doorgaan?');
  if (!bevestig) return;
  const { error } = await supabase.rpc('update_profile_role', { profile_id: id, new_role: nieuweRol });
  if (error) { showToast('Fout: ' + error.message); return; }
  showToast('Rol gewijzigd'); loadCoordVolunteers();
}

async function sendInvite() {
  const email = document.getElementById('invite-email').value.trim();
  const name  = document.getElementById('invite-name').value.trim();
  if (!email || !name) { showToast('Vul naam en e-mailadres in'); return; }
  if (isDemo) { closeModal('modal-invite'); showToast('(Demo) Uitnodiging verstuurd naar ' + email); return; }
  const { error } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { name, role: 'volunteer' }
  });
  if (error) { showToast('Fout: ' + error.message); return; }
  closeModal('modal-invite');
  showToast('Uitnodiging verstuurd naar ' + email);
}

// ---
// AVG - OPRUIMEN
// ---
async function loadAvgCleanup() {
  const el = document.getElementById('avg-cleanup-list');
  if (isDemo) {
    el.innerHTML = `
      <div class="avg-item">
        <div class="avg-dot dot-green"></div>
        <div>
          <div class="avg-label">Geen verlopen gegevens gevonden</div>
          <div class="avg-sub">Alle data is binnen de bewaartermijn</div>
        </div>
      </div>`;
    return;
  }
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
  const { data } = await supabase.from('tasks')
    .select('id,description,completed_at')
    .eq('status','done')
    .lt('completed_at', cutoff.toISOString());
  if (!data?.length) {
    el.innerHTML = `<div style="font-size:13px;color:var(--clr-text-muted)">Geen verlopen taakgegevens gevonden.</div>`;
    return;
  }
  el.innerHTML = data.map(t => `
    <div class="avg-item">
      <div class="avg-dot dot-amber"></div>
      <div style="flex:1">
        <div class="avg-label">${t.description}</div>
        <div class="avg-sub">Afgerond op ${new Date(t.completed_at).toLocaleDateString('nl-NL')}</div>
      </div>
      <button class="btn btn-danger" style="width:auto;padding:6px 12px;font-size:12px" onclick="deleteTaskData('${t.id}')">Verwijderen</button>
    </div>`).join('');
}

async function deleteTaskData(id) {
  await supabase.from('tasks').update({ private_name: null, private_address: null, private_phone: null }).eq('id',id);
  showToast('Persoonsgegevens verwijderd'); loadAvgCleanup();
}

async function loadArchief() {
  const el = document.getElementById('archief-list');
  if (!el) return;
  el.innerHTML = '<div class="loading"><div class="spinner"></div>Laden...</div>';

  let taken = [];
  if (isDemo) {
    taken = demoTasks.filter(t => t.status === 'done');
  } else {
    const { data, error } = await supabase.from('tasks')
      .select('id,type,description,date,assigned_to,completed_at')
      .eq('status','done')
      .order('completed_at', { ascending: false });
    if (error) { el.innerHTML = '<div class="empty"><p>Fout bij laden archief.</p></div>'; return; }
    taken = data || [];
  }

  if (!taken.length) {
    el.innerHTML = '<div class="empty"><div class="empty-icon">&#128193;</div><p>Nog geen afgeronde taken.</p></div>';
    return;
  }

  el.innerHTML = `<div class="section-lbl">Afgeronde taken (${taken.length})</div>` +
    taken.map(t => {
      const dateStr = t.completed_at ? new Date(t.completed_at).toLocaleDateString('nl-NL', {day:'numeric', month:'long', year:'numeric'}) : '-';
      return `<div class="card" style="margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
          <div>
            <div style="font-size:12px;color:var(--clr-text-muted)">${t.type} &bull; Afgerond op ${dateStr}</div>
            <div style="font-size:15px;font-weight:500;margin-top:2px">${t.description || '-'}</div>
            ${t.assigned_to ? `<div style="font-size:13px;color:var(--clr-accent);margin-top:3px">${t.assigned_to}</div>` : ''}
          </div>
          <button class="btn btn-danger" style="width:auto;padding:6px 10px;font-size:12px;flex-shrink:0" onclick="verwijderUitArchief('${t.id}')">Verwijderen</button>
        </div>
      </div>`;
    }).join('');
}

async function verwijderUitArchief(id) {
  if (!confirm('Wil je deze taak permanent verwijderen uit het archief?')) return;
  if (isDemo) {
    demoTasks = demoTasks.filter(t => t.id !== id);
    showToast('Taak verwijderd'); loadArchief(); return;
  }
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) { showToast('Fout: ' + error.message); return; }
  showToast('Taak verwijderd uit archief'); loadArchief();
}

function updateAvgBtn() {
  const cb1 = document.getElementById('avg-cb-1');
  const cb2 = document.getElementById('avg-cb-2');
  const btn = document.getElementById('btn-avg-akkoord');
  if (!btn) return;
  const beide = cb1.checked && cb2.checked;
  btn.disabled = !beide;
  btn.style.opacity = beide ? '1' : '0.45';
  btn.style.cursor  = beide ? 'pointer' : 'not-allowed';
}

function bevestigAvg() {
  const cb1 = document.getElementById('avg-cb-1');
  const cb2 = document.getElementById('avg-cb-2');
  if (!cb1.checked || !cb2.checked) return;
  localStorage.setItem('avg_akkoord_' + currentUser.email, 'ja');
  closeModal('modal-avg');
}

function checkAvgToestemming() {
  if (!currentUser) return;
  const akkoord = localStorage.getItem('avg_akkoord_' + currentUser.email);
  if (!akkoord) {
    // Checkboxen resetten en knop uitschakelen bij elke keer openen
    ['avg-cb-1', 'avg-cb-2'].forEach(id => {
      const cb = document.getElementById(id);
      if (cb) cb.checked = false;
    });
    updateAvgBtn();
    openModal('modal-avg');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  ['avg-cb-1', 'avg-cb-2'].forEach(id => {
    const cb = document.getElementById(id);
    if (cb) cb.addEventListener('change', updateAvgBtn);
  });
});

function initCheckboxes() {
  document.querySelectorAll('.checkbox-item').forEach(item => {
    const cb = item.querySelector('input[type=checkbox]');
    if (cb && cb.checked) item.classList.add('selected');
  });
}

function toggleCheck(label) {
  const cb = label.querySelector('input[type=checkbox]');
  setTimeout(() => label.classList.toggle('selected', cb.checked), 0);
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

async function saveProfile() {
  const firstname = document.getElementById('profile-firstname').value.trim();
  const lastname = document.getElementById('profile-lastname').value.trim();
  const days = document.getElementById('profile-days').value.trim();
  const maxTasks = document.getElementById('profile-max-tasks').value;
  const phone = document.getElementById('profile-phone').value.trim();
  const taskTypes = Array.from(document.querySelectorAll('#profile-task-types input:checked')).map(cb => cb.value);
  const fullName = [firstname, lastname].filter(Boolean).join(' ') || null;

  if (!supabase || !currentUser) { showToast('Profiel opgeslagen'); return; }

  const updates = {
    days, max_tasks_per_month: parseInt(maxTasks),
    task_types: taskTypes, phone,
    last_active: new Date().toISOString()
  };
  if (fullName) updates.name = fullName;

  const { error } = await supabase.from('profiles').update(updates).eq('id', currentUser.id);

  if (error) { showToast('Fout: ' + error.message); return; }

  // Update avatar met nieuwe naam
  if (fullName) {
    const initials = fullName.split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase();
    document.getElementById('nav-avatar').textContent = initials;
    document.getElementById('profile-name').textContent = fullName;
    document.getElementById('profile-avatar-lg').textContent = initials;
  }

  showToast('Profiel opgeslagen');
}


// ---
// PROFIEL LADEN
// ---
async function loadProfileData() {
  if (!supabase || !currentUser) return;
  const { data, error } = await supabase
    .from('profiles')
    .select('name, phone, days, max_tasks_per_month, task_types')
    .eq('id', currentUser.id)
    .single();
  if (error || !data) return;

  const nameParts = (data.name || '').split(' ');
  document.getElementById('profile-firstname').value = nameParts[0] || '';
  document.getElementById('profile-lastname').value = nameParts.slice(1).join(' ') || '';
  document.getElementById('profile-phone').value = data.phone || '';
  document.getElementById('profile-days').value = data.days || '';

  const maxTasksEl = document.getElementById('profile-max-tasks');
  if (data.max_tasks_per_month) maxTasksEl.value = String(data.max_tasks_per_month);

  const taskTypes = Array.isArray(data.task_types) ? data.task_types : [];
  document.querySelectorAll('#profile-task-types input').forEach(cb => {
    cb.checked = taskTypes.includes(cb.value);
    const label = cb.closest('.checkbox-item');
    if (label) label.classList.toggle('checked', cb.checked);
  });
}
function logout() {
  if (supabase) supabase.auth.signOut();
  currentUser = null; isDemo = false;
  showScreen('screen-login');
}

function exportVolunteerData() {
  const email = document.getElementById('avg-request-email').value.trim();
  if (!email) { showToast('Voer een e-mailadres in'); return; }
  showToast('Gegevensexport aangevraagd voor ' + email);
}

function deleteVolunteerData() {
  const email = document.getElementById('avg-request-email').value.trim();
  if (!email) { showToast('Voer een e-mailadres in'); return; }
  if (!confirm('Wil je alle gegevens van ' + email + ' permanent verwijderen?')) return;
  showToast('Verwijderverzoek verwerkt voor ' + email);
}

