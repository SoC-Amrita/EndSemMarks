import React, { useState, useEffect } from 'react';
import { numberToWords } from './utils';
import studentsData from './students.json';
import { supabase } from './supabaseClient';
import Login from './Login';

export default function App() {
  const [session, setSession] = useState(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [viewMode, setViewMode] = useState('sheet'); // 'sheet' or 'bulk'

  const allSections = Object.keys(studentsData);
  const [sections, setSections] = useState([]);
  const [activeSection, setActiveSection] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [reviewerName, setReviewerName] = useState('Dr. Vandhana S');
  const [debugMsg, setDebugMsg] = useState('');
  const [showPasswordPanel, setShowPasswordPanel] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordFeedback, setPasswordFeedback] = useState(null);
  const [passwordUpdating, setPasswordUpdating] = useState(false);

  // Reload reviewer per section when active section changes
  useEffect(() => {
    if (activeSection) {
      const saved = localStorage.getItem(`reviewerName_${activeSection}`);
      setReviewerName(saved || 'Dr. Vandhana S');
    }
  }, [activeSection]);
  
  // Storing marks per section
  const [marks, setMarks] = useState(() => {
    const initial = {};
    allSections.forEach(s => { initial[s] = {}; });
    return initial;
  });

  const initializeAuthAndData = async (sessionParam) => {
    setSession(sessionParam);
    if (!sessionParam) {
      setLoadingInitial(false);
      return;
    }

    // 1. Resolve role
    const { data: roleData, error: roleError } = await supabase.from('user_roles').select('role').eq('user_id', sessionParam.user.id).single();
    const role = roleData?.role || 'faculty';
    setUserRole(role);
    
    let dbg = `[Dev Email: ${sessionParam.user.email}] [Local UI UUID: ${sessionParam.user.id.substring(0,8)}...] [Role Error: ${roleError?.message || 'None'}] [Role Fetch: ${roleData ? roleData.role : 'NULL'}] `;

    // 2. Resolve specific sections securely
    let allowed = [];
    if (role === 'admin') {
      allowed = allSections;
    } else {
      const { data: secData, error: secError } = await supabase.from('faculty_sections').select('section').eq('user_id', sessionParam.user.id);
      dbg += `| [Sec Error: ${secError?.message || 'None'}] [Sec Fetch: ${secData ? secData.length : 'NULL'}]`;
      if (secData && secData.length > 0) {
        allowed = secData.map(s => s.section);
      }
    }
    
    setDebugMsg(dbg);

    setSections(allowed);
    if (allowed.length > 0) {
      setActiveSection(allowed[0]);
      await fetchMarks(); 
    } else {
      setLoadingInitial(false); // Done loading, caught in unauthorized UI handler below
    }
  };

  useEffect(() => {
    if (!supabase) {
      setLoadingInitial(false);
      return;
    }
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) initializeAuthAndData(session);
      else setLoadingInitial(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) initializeAuthAndData(session);
      else setSession(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchMarks = async () => {
     if (!supabase) return;
     const { data, error } = await supabase.from('marks').select('*');
     if (!error && data) {
        setMarks(prev => {
          const fresh = { ...prev };
          data.forEach(row => {
             if (!fresh[row.section]) fresh[row.section] = {};
             fresh[row.section][row.roll_no] = row.mark;
          });
          return fresh;
        });
     }
     setLoadingInitial(false);
  };

  const facultyNames = {
    'A': 'Prof. P Malathi',
    'B': 'Prof. G Krishna Priya',
    'C': 'Prof. Anisha Radhakrishnan',
    'D': 'Mr. Vedaj J Padman',
    'E': 'Dr. Suchithra M',
    'F': 'Prof. G Krishna Priya',
    'G': 'Dr. T Senthilkumar',
    'H': 'Prof. Anisha Radhakrishnan'
  };
  const activeExaminer = facultyNames[activeSection] || 'Prof. P Malathi';

  if (loadingInitial) return <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>Loading Secure Portal...</div>;
  if (!session) return <Login onLoginComplete={setSession} />;
  
  // Catch completely unassigned users
  if (!activeSection) {
     return (
        <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' }}>
          <div style={{ padding: '40px', background: 'white', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', textAlign: 'center' }}>
            <h2 style={{ color: '#d9534f' }}>Unauthorized Access</h2>
            <p>Your Faculty account has been verified, but you have not been mapped to a Section yet.</p>
            <p>Please contact the Administrator to verify your database assignments.</p>
            <div style={{ marginTop: '20px', padding: '10px', background: '#ffebee', color: '#c62828', borderRadius: '4px', fontSize: '13px', border: '1px solid #c62828' }}>
               <strong>Diagnostic Log:</strong> {debugMsg}
            </div>
          </div>
        </div>
     );
  }

  const handleMarkChange = async (rollNo, value) => {
    let finalVal = value;
    const vMatch = finalVal.toLowerCase().trim();
    if (vMatch === 'ab' || vMatch === '-ab-') {
      finalVal = '-AB-';
    }
    
    // Optimistic local update
    setMarks(prev => ({
      ...prev,
      [activeSection]: {
        ...prev[activeSection],
        [rollNo]: finalVal
      }
    }));
    
    // Remote database sync
    if (supabase) {
       await supabase.from('marks').upsert({
          roll_no: rollNo,
          section: activeSection,
          mark: finalVal,
          updated_by: session.user.id
       });
    }
  };

  const handlePrint = () => {
    window.print();
  };


  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      const formInputs = Array.from(document.querySelectorAll('.mark-input'));
      const currentIndex = formInputs.indexOf(e.target);
      if (currentIndex > -1 && currentIndex < formInputs.length - 1) {
         formInputs[currentIndex + 1].focus();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const formInputs = Array.from(document.querySelectorAll('.mark-input'));
      const currentIndex = formInputs.indexOf(e.target);
      if (currentIndex > 0) {
         formInputs[currentIndex - 1].focus();
      }
    }
  };

  const activeStudents = studentsData[activeSection] || [];

  const studentChunks = [];
  let remaining = activeStudents;
  
  if (remaining.length > 0) {
    studentChunks.push(remaining.slice(0, 30));
    remaining = remaining.slice(30);
  }
  while (remaining.length > 0) {
    studentChunks.push(remaining.slice(0, 36));
    remaining = remaining.slice(36);
  }

  const downloadTemplate = () => {
    const csvHeader = "Roll No,Marks Awarded\n";
    const csvContent = activeStudents.map(roll => `${roll},`).join("\n");
    const blob = new Blob([csvHeader + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `template_vi_${activeSection}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target.result;
      const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      
      const newMarksChunk = {};
      const upsertPayload = [];

      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',');
        if (parts.length >= 2) {
           const rollNo = parts[0].trim();
           let markVal = parts[1].trim();
           
           if (!rollNo) continue;
           const vMatch = markVal.toLowerCase().trim();
           if (vMatch === 'ab' || vMatch === '-ab-') markVal = '-AB-';
           
           newMarksChunk[rollNo] = markVal;
           upsertPayload.push({
              roll_no: rollNo,
              section: activeSection,
              mark: markVal,
              updated_by: session.user.id
           });
        }
      }
      
      setMarks(prev => ({
        ...prev,
        [activeSection]: {
          ...prev[activeSection],
          ...newMarksChunk
        }
      }));

      if (supabase && upsertPayload.length > 0) {
         await supabase.from('marks').upsert(upsertPayload);
         setViewMode('sheet');
         alert(`Successfully imported ${upsertPayload.length} marks for section VI ${activeSection}!`);
      } else if (upsertPayload.length > 0) {
         setViewMode('sheet');
      }
    };
    reader.readAsText(file);
  };

  const handleDeleteSection = async () => {
    if (!window.confirm(`Delete ALL marks for Section VI ${activeSection}? This cannot be undone.`)) return;
    if (supabase) {
      const { error } = await supabase.from('marks').delete().eq('section', activeSection);
      if (error) {
        alert('Error deleting records: ' + error.message);
      } else {
        setMarks(prev => ({ ...prev, [activeSection]: {} }));
        alert(`All marks for Section VI ${activeSection} have been cleared.`);
      }
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordFeedback(null);

    if (newPassword.length < 6) {
      setPasswordFeedback({ type: 'error', message: 'Password must be at least 6 characters long.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ type: 'error', message: 'New password and confirmation do not match.' });
      return;
    }

    if (!supabase) {
      setPasswordFeedback({ type: 'error', message: 'Database connection error. Check configuration.' });
      return;
    }

    setPasswordUpdating(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordUpdating(false);

    if (error) {
      setPasswordFeedback({ type: 'error', message: error.message });
      return;
    }

    setNewPassword('');
    setConfirmPassword('');
    setPasswordFeedback({ type: 'success', message: 'Password updated successfully.' });
    setShowPasswordPanel(false);
  };

  return (
    <div className="app-container">
      <aside className="sidebar no-print">
        <div className="sidebar-header">
          <div className="sidebar-kicker">Faculty Workspace</div>
          <h2>Marks Console</h2>
        </div>

        <div className="sidebar-status-card">
          <div>
            <span className="sidebar-status-label">Active Section</span>
            <strong>VI {activeSection}</strong>
          </div>
          <span className="sidebar-role-pill">{userRole === 'admin' ? 'Admin' : 'Faculty'}</span>
        </div>

        <div className="sidebar-stats">
          <div className="sidebar-stat">
            <span>Assigned</span>
            <strong>{sections.length}</strong>
          </div>
          <div className="sidebar-stat">
            <span>Mode</span>
            <strong>{viewMode === 'sheet' ? 'Sheet' : 'CSV'}</strong>
          </div>
        </div>

        <div className="sidebar-field">
          <label>Select View</label>
          <select value={viewMode} onChange={e => setViewMode(e.target.value)}>
            <option value="sheet">Marks Entry Sheet</option>
            <option value="bulk">Bulk CSV Manager</option>
          </select>
        </div>

        <div className="sidebar-field">
          <label>Select Section</label>
          <select value={activeSection} onChange={e => setActiveSection(e.target.value)}>
            {sections.map(sec => (
              <option key={sec} value={sec}>VI {sec}</option>
            ))}
          </select>
        </div>
        
        {viewMode === 'sheet' && (
          <>
            <div className="sidebar-field">
              <label>Reviewer Setup</label>
              <select value={reviewerName} onChange={e => { setReviewerName(e.target.value); localStorage.setItem(`reviewerName_${activeSection}`, e.target.value); }}>
                <option value="Dr. Vandhana S">Dr. Vandhana S</option>
                <option value="Prof. Neethu M R">Prof. Neethu M R</option>
              </select>
            </div>

            <button onClick={handlePrint} className="btn-primary">Print Sheet</button>
          </>
        )}
        
        {userRole === 'admin' && (
          <button onClick={handleDeleteSection} className="btn-danger sidebar-spaced-action">
            Clear Section {activeSection} Records
          </button>
        )}

        <div className="sidebar-session-card">
          <span className="sidebar-status-label">Signed In</span>
          <div className="sidebar-session-email">{session.user.email}</div>
        </div>

        <div className="sidebar-password-card">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setShowPasswordPanel(prev => !prev);
              setPasswordFeedback(null);
            }}
          >
            {showPasswordPanel ? 'Hide Password Change' : 'Change Password'}
          </button>

          {showPasswordPanel && (
            <form onSubmit={handlePasswordChange} className="password-form">
              <label className="sidebar-field">
                <span className="password-field-label">New Password</span>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Enter a new password"
                  autoComplete="new-password"
                  required
                />
              </label>

              <label className="sidebar-field">
                <span className="password-field-label">Confirm Password</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter the new password"
                  autoComplete="new-password"
                  required
                />
              </label>

              <button type="submit" className="btn-primary" disabled={passwordUpdating}>
                {passwordUpdating ? 'Updating Password...' : 'Save New Password'}
              </button>
            </form>
          )}

          {passwordFeedback && (
            <div className={`password-feedback ${passwordFeedback.type === 'error' ? 'password-feedback-error' : 'password-feedback-success'}`}>
              {passwordFeedback.message}
            </div>
          )}
        </div>

        <button onClick={async () => await supabase.auth.signOut()} className="btn-danger btn-ghost-danger">Logout Session</button>
      </aside>

      <main className="main-content">
        {viewMode === 'bulk' ? (
        <div className="bulk-manager">
          <div className="bulk-manager-header">
            <span className="bulk-kicker">CSV Import</span>
            <h3>Bulk sync for Section VI {activeSection}</h3>
            <p>Use the prepared roster template, fill in marks offline, and upload the completed CSV to update this section in one pass.</p>
          </div>

          <div className="bulk-manager-grid">
            <section className="bulk-card">
              <span className="bulk-card-step">Step 1</span>
              <h4>Download the roster template</h4>
              <p>Get a clean CSV with every student in the current section already listed and ready for marks entry.</p>
              <button onClick={downloadTemplate} className="bulk-download-btn">
                Download Pre-filled Template
              </button>
            </section>

            <section className="bulk-card bulk-card-upload">
              <span className="bulk-card-step">Step 2</span>
              <h4>Upload the completed file</h4>
              <p>Accepted format: `.csv`. The upload syncs marks directly to the database for Section VI {activeSection}.</p>
              <div className="file-input-wrapper">
                <input type="file" accept=".csv" onChange={handleFileUpload} />
                <div className="file-input-copy">
                  <strong>Select CSV file</strong>
                  <span>Choose the completed sheet to import marks instantly.</span>
                </div>
              </div>
            </section>
          </div>
        </div>
      ) : (
        studentChunks.map((chunk, chunkIndex) => (
          <div key={chunkIndex} className="sheet" style={{ pageBreakAfter: chunkIndex < studentChunks.length - 1 ? 'always' : 'auto' }}>
          <table className="marks-table">
            <thead>
              {chunkIndex === 0 && (
                <>
                  <tr>
                    <th colSpan="4" className="text-center no-border" style={{ fontWeight: 'normal', fontSize: '16pt' }}>Amrita Vishwa Vidyapeetham</th>
                  </tr>
                  <tr>
                    <th colSpan="4" className="text-center font-bold no-border" style={{ fontSize: '16pt' }}>B.Tech (2023) Degree Examination March 2026</th>
                  </tr>
                  <tr>
                    <th colSpan="4" className="text-center font-bold small-caps no-border" style={{ fontSize: '16pt' }}>Marks Sheet for Theory Examinations</th>
                  </tr>
                  <tr>
                    <th colSpan="3" className="font-bold no-border" style={{ textAlign: "left", whiteSpace: "nowrap" }}>Branch : Computer Science and Engineering</th>
                    <th colSpan="1" className="font-bold no-border" style={{ textAlign: "right", whiteSpace: "nowrap" }}>Semester : VI {activeSection}</th>
                  </tr>
                  <tr>
                    <th colSpan="4" className="font-bold no-border" style={{ textAlign: "left" }}>Subject Code & Title : 23CSE311 Software Engineering</th>
                  </tr>
                </>
              )}
              <tr>
                <th className="col-sno" rowSpan="2">S.No.</th>
                <th className="col-roll" rowSpan="2">Roll No.</th>
                <th className="col-marks" colSpan="2">Marks Awarded (Max Marks : 50)</th>
              </tr>
              <tr>
                <th className="col-figures">In Figures</th>
                <th className="col-words">In Words</th>
              </tr>
            </thead>
            <tbody>
              {chunk.map((rollNo, chunkLocalIndex) => {
                const overallIndex = chunkIndex === 0 ? chunkLocalIndex : (30 + ((chunkIndex - 1) * 36)) + chunkLocalIndex;
                const val = marks[activeSection][rollNo] || '';
                return (
                  <tr key={rollNo}>
                    <td className="text-center">{overallIndex + 1}</td>
                    <td className="text-center">{rollNo}</td>
                    <td>
                      <input 
                        type="text" 
                        className="mark-input text-center"
                        value={val}
                        onChange={e => handleMarkChange(rollNo, e.target.value)}
                        onKeyDown={handleKeyDown}
                      />
                    </td>
                    <td className="text-center">
                      <div className="words-display">{numberToWords(val)}</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {chunkIndex === studentChunks.length - 1 && (
            <>
              <div style={{ height: '120px' }}></div>
              <div className="signatures flex-between font-bold">
                <div className="sign-block">
                  <div className="sign-line">Signature of the Reviewer with Date</div>
                  <div className="name-block mt-1">
                    <div className="small-caps">{reviewerName}</div>
                    <div className="font-normal text-sm small-caps">Name in Capitals</div>
                  </div>
                </div>
                <div className="sign-block text-right">
                  <div className="sign-line">Signature of the Examiner with Date</div>
                  <div className="name-block mt-1 text-right">
                    <div className="small-caps">{activeExaminer}</div>
                    <div className="font-normal text-sm small-caps flex-end">Name in Capitals</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
        ))
      )}
      </main>
    </div>
  );
}
