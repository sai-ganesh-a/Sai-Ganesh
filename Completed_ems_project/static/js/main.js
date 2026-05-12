/* ─── APP STATE & INITIALIZATION ────────────────────── */
let currentUser = {
  name: 'Priya Sharma',
  role: 'hr', 
  id: 'EMP-2001'
};

const ROLE_CONFIG = {
  hr: { label: 'HR Access', controls: '.hr-controls, .supervisor-controls' },
  supervisor: { label: 'Mgmt Access', controls: '.supervisor-controls' },
  employee: { label: 'User Access', controls: '' }
};

document.addEventListener('DOMContentLoaded', () => {
  applyRoleUI();
});

/* ─── AUTHENTICATION LOGIC ──────────────────────────── */
function selectRole(btn, role) {
  document.querySelectorAll('.login-role-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  currentUser.role = role;
}

function doLogin(e) {
  e.preventDefault();
  
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  // currentUser.role is updated by the selectRole() function when clicking tabs
  const selectedRole = currentUser.role;
  fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email, password: password ,role: selectedRole})
  })
  .then(response => response.json())
  .then(data => {
    if (data.status === "success") {
      // We update the local state before redirecting
      currentUser.name = data.user.name;
      currentUser.role = data.user.role;
      currentUser.id = data.user.id;
      // Now redirect to the home route which handles role-based templates
      window.location.href = "/";
    } else {
      showToast("Invalid Credentials");
    }
  })
  .catch(err => {
    console.error("Login Error:", err);
    showToast("Server error. Please try again.")
    window.location.href = "/"; 
  });
}

function logout() {
  window.location.href = "/login";
}

/* ─── NAVIGATION & VIEW SWITCHING ────────────────────── */
function showView(viewId) {
  document.querySelectorAll('.sidebar-nav-item').forEach(item => {
    item.classList.remove('active');
    if (item.getAttribute('onclick')?.includes(viewId)) {
      item.classList.add('active');
    }
  });

  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const target = document.getElementById(`view-${viewId}`);
  if (target) target.classList.add('active');

  const titles = {
    'dashboard': 'HR Dashboard',
    'employees': 'Manage Employees',
    'leave-approval': 'Leave Requests',
    'my-profile': 'My Profile'
  };
  document.getElementById('current-view-title').textContent = titles[viewId] || 'Nexus EMS';
}

/* ─── MODAL MANAGEMENT ───────────────────────────────── */
function openAddEmployeeModal() {
  const modal = document.getElementById('modal-overlay');
  const container = document.getElementById('generic-modal');
  const template = document.getElementById('add-employee-modal-content');
  
  if (template) {
    container.innerHTML = template.innerHTML;
    modal.classList.add('open');
  }
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
}

/**
 * FIXED: submitAddEmployee
 * Now properly targets the elements inside the active modal container
 */
function submitAddEmployee() {
    // We look inside 'generic-modal' to ensure we get the elements currently visible to the user
    const modalContainer = document.getElementById('generic-modal');
    
    const nameInput = modalContainer.querySelector('#new-emp-name');
    const emailInput = modalContainer.querySelector('#new-emp-email');
    const personalEmailInput = modalContainer.querySelector('#new-emp-personal-email');
    const idInput = modalContainer.querySelector('#new-emp-id');
    const deptInput = modalContainer.querySelector('#new-emp-dept');

    // Extract values
    const name = nameInput ? nameInput.value.trim() : "";
    const email = emailInput ? emailInput.value.trim() : "";
    const personalEmail = personalEmailInput ? personalEmailInput.value.trim() : "";
    const empId = idInput ? idInput.value.trim() : "";
    const dept = deptInput ? deptInput.value : "Engineering";

    // Debugging (Image 4498b7 fix)
    console.log("Attempting to Save:", { name, email, personalEmail });

    if (!name || !email || !personalEmail) {
        showToast("Please fill in all required fields.");
        return;
    }

    const employeeData = {
        name: name,
        email: email,
        personal_email: personalEmail,
        id: empId || "EMP-" + Math.floor(1000 + Math.random() * 9000),
        department: dept,
        role: 'employee',
        designation: 'Associate'
    };

    fetch('/api/employees/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(employeeData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === "success") {
            showToast("Employee Added Successfully!");
            closeModal();
            // Refresh to show the new entry in the table
            setTimeout(() => window.location.reload(), 800);
        } else {
            showToast("Error: " + (data.message || "Could not save employee"));
        }
    })
    .catch(err => {
        console.error("Fetch Error:", err);
        showToast("Server Connection Failed");
    });
}

/* ─── LEAVE MANAGEMENT ───────────────────────────────── */
function approveLeave(id, btn) {
  const card = btn.closest('.leave-request-card');
  card.dataset.cardStatus = 'approved';
  const badge = card.querySelector('.badge');
  badge.className = 'badge badge-approved';
  badge.textContent = 'Approved';
  
  const actions = card.querySelector('.leave-card-actions');
  actions.innerHTML = '<div style="color:var(--success); font-weight:500; text-align:center; padding:.5rem;">✓ Request Approved</div>';
  
  showToast(`Leave ${id} approved`);
  updateLeaveBadges();
}

function toggleRejectReason(btn) {
  const wrap = btn.closest('.leave-card-actions').querySelector('.reject-reason-wrap');
  wrap.classList.toggle('open');
}

function confirmReject(id, btn) {
  const actions = btn.closest('.leave-card-actions');
  const reasonText = actions.querySelector('textarea').value.trim();
  
  if (!reasonText) {
    showToast('⚠ Please provide a reason');
    return;
  }
  
  const card = btn.closest('.leave-request-card');
  card.dataset.cardStatus = 'rejected';
  card.querySelector('.badge').className = 'badge badge-rejected';
  card.querySelector('.badge').textContent = 'Rejected';
  actions.innerHTML = `<div style="color:var(--danger); font-size:.85rem; padding:.5rem;">✗ Rejected: ${reasonText}</div>`;
  
  showToast(`Leave ${id} rejected`);
  updateLeaveBadges();
}

function updateLeaveBadges() {
  const pendingCount = document.querySelectorAll('.leave-request-card[data-card-status="pending"]').length;
  document.querySelectorAll('.sidebar-nav-badge').forEach(badge => {
    badge.textContent = pendingCount || '';
    badge.style.display = pendingCount > 0 ? 'block' : 'none';
  });
}

/* ─── UI UTILITIES ────────────────────────────────────── */
function applyRoleUI() {
  const controls = ROLE_CONFIG[currentUser.role].controls;
  document.querySelectorAll('.hr-controls, .supervisor-controls').forEach(el => el.style.display = 'none');
  if (controls) {
    document.querySelectorAll(controls).forEach(el => el.style.display = 'block');
  }
}

function showToast(msg) {
  let toast = document.getElementById('global-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'global-toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function filterEmployees() {
  const query = document.getElementById('employee-search').value.toLowerCase();
  const dept = document.getElementById('dept-filter').value;
  
  document.querySelectorAll('#employee-table tbody tr').forEach(row => {
    const text = row.innerText.toLowerCase();
    const matchesQuery = text.includes(query);
    const matchesDept = dept === 'all' || text.includes(dept.toLowerCase());
    row.style.display = (matchesQuery && matchesDept) ? 'table-row' : 'none';
  });
}