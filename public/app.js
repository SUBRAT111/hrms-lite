const API = "/api";  // Works locally and on Railway

// DASHBOARD
async function loadDashboard() {
  const res = await fetch(`${API}/dashboard`);
  const data = await res.json();
  empCount.textContent = data.totalEmployees;
  presentCount.textContent = data.totalPresent;
}

// EMPLOYEES
async function loadEmployees() {
  const res = await fetch(`${API}/employees`);
  const data = await res.json();

  employees.innerHTML = "";
  empSelect.innerHTML = "";

  if (data.length === 0) employees.innerHTML = "<li>No employees found</li>";

  data.forEach(e => {
    employees.innerHTML += `<li>${e.fullName} (${e.department}) <button onclick="deleteEmployee('${e.employeeId}')">Delete</button></li>`;
    empSelect.innerHTML += `<option value="${e.employeeId}">${e.fullName}</option>`;
  });
}

async function addEmployee() {
  error.textContent = "";
  if (!eid.value || !fullName.value || !email.value || !dept.value) {
    error.textContent = "All fields are required";
    return;
  }

  const res = await fetch(`${API}/employees`, {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({ 
      employeeId: eid.value, 
      fullName: fullName.value, 
      email: email.value, 
      department: dept.value 
    })
  });

  const data = await res.json();
  if (!res.ok) error.textContent = data.error;
  else {
    eid.value = fullName.value = email.value = dept.value = "";
    loadEmployees(); loadDashboard();
  }
}

async function deleteEmployee(id) {
  await fetch(`${API}/employees/${id}`, { method:"DELETE" });
  loadEmployees(); loadDashboard();
}

// ATTENDANCE
async function markAttendance() {
  // Get elements
  const empSelect = document.getElementById("empSelect");
  const date = document.getElementById("date");
  const status = document.getElementById("status");

  const empError = document.getElementById("empError");
  const dateError = document.getElementById("dateError");
  const statusError = document.getElementById("statusError");

  // Clear previous errors
  empError.textContent = "";
  dateError.textContent = "";
  statusError.textContent = "";

  // Validation flag
  let valid = true;

  if (!empSelect.value) {
    empError.textContent = "Please select an employee";
    valid = false;
  }

  if (!date.value) {
    dateError.textContent = "Please select a date";
    valid = false;
  }

  if (!status.value) {
    statusError.textContent = "Please select status";
    valid = false;
  }

  if (!valid) return; // stop if invalid

  // Proceed to send data if valid
  try {
    const res = await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId: empSelect.value,
        date: date.value,
        status: status.value,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Failed to mark attendance");
      return;
    }

    alert("Attendance marked successfully!");

    // Reload attendance and summary lists
    filterAttendance();
    loadAttendanceSummary();
    loadDashboard();

  } catch (err) {
    console.error(err);
    alert("Error connecting to server");
  }
}


// FILTER ATTENDANCE
async function filterAttendance() {
  let url = `${API}/attendance`;
  if (filterDate.value) url += `?date=${filterDate.value}`;
  const res = await fetch(url);
  const data = await res.json();
  attendance.innerHTML = "";
  if (data.length===0) attendance.innerHTML="<li>No records found</li>";
  data.forEach(a => { attendance.innerHTML += `<li>${a.date} - ${a.fullName} - ${a.status}</li>`; });
}

// ATTENDANCE SUMMARY
async function loadAttendanceSummary() {
  const res = await fetch(`${API}/attendance-summary`);
  const data = await res.json();
  summaryTable.innerHTML="";
  data.forEach(r => { summaryTable.innerHTML += `<tr><td>${r.fullName}</td><td>${r.presentDays}</td></tr>`; });
}

// INIT
loadDashboard(); loadEmployees(); filterAttendance(); loadAttendanceSummary();
