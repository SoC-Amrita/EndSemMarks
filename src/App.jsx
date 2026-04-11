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
    'E': 'Prof. Suchithra M',
    'F': 'Prof. G Krishna Priya',
    'G': 'Prof. T Senthilkumar',
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
    studentChunks.push(remaining.slice(0, 32));
    remaining = remaining.slice(32);
  }
  while (remaining.length > 0) {
    studentChunks.push(remaining.slice(0, 40));
    remaining = remaining.slice(40);
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
         alert(`Successfully imported ${upsertPayload.length} marks for section VI ${activeSection}!`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="app-container">
      <aside className="sidebar no-print">
        <label>Select View:</label>
        <select value={viewMode} onChange={e => setViewMode(e.target.value)}>
          <option value="sheet">Marks Entry Sheet</option>
          <option value="bulk">Bulk CSV Manager</option>
        </select>

        <label>Select Section:</label>
        <select value={activeSection} onChange={e => setActiveSection(e.target.value)}>
          {sections.map(sec => (
            <option key={sec} value={sec}>VI {sec}</option>
          ))}
        </select>
        
        {viewMode === 'sheet' && (
           <>
             <label>Reviewer Setup:</label>
             <select value={reviewerName} onChange={e => setReviewerName(e.target.value)}>
               <option value="Dr. Vandhana S">Dr. Vandhana S</option>
               <option value="Prof. Neethu M R">Prof. Neethu M R</option>
             </select>

             <button onClick={handlePrint} className="btn-primary">Print Sheet</button>
           </>
        )}
        
        <button onClick={async () => await supabase.auth.signOut()} className="btn-danger">Logout Session</button>
      </aside>

      <main className="main-content">
        {viewMode === 'bulk' ? (
        <div className="bulk-manager">
          <h3>Mass Import for Section VI {activeSection}</h3>
          <p>Download a cleanly formatted CSV template listing all students in this section, modify it in Excel, and upload it to instantly sync the database.</p>
          
          <button 
            onClick={downloadTemplate}
            style={{ padding: '10px 20px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Download Pre-filled Template (.csv)
          </button>
          
          <div className="file-input-wrapper">
             <h4>Upload Completed CSV</h4>
             <input type="file" accept=".csv" onChange={handleFileUpload} />
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
                const overallIndex = chunkIndex === 0 ? chunkLocalIndex : (32 + ((chunkIndex - 1) * 40)) + chunkLocalIndex;
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
            <div className="signatures flex-between font-bold">
              <div className="sign-block">
                <div className="sign-line">Signature of the Reviewer with Date</div>
                <div className="name-block mt-4">
                  <div className="small-caps">{reviewerName}</div>
                  <div className="font-normal text-sm small-caps">Name in Capitals</div>
                </div>
              </div>
              <div className="sign-block text-right">
                <div className="sign-line">Signature of the Examiner with Date</div>
                <div className="name-block mt-4 text-right">
                  <div className="small-caps">{activeExaminer}</div>
                  <div className="font-normal text-sm small-caps flex-end">Name in Capitals</div>
                </div>
              </div>
            </div>
          )}
        </div>
        ))
      )}
      </main>
    </div>
  );
}
