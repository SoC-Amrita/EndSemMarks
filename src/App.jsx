import React, { useState, useEffect, useRef } from 'react';
import { numberToWords } from './utils';
import studentsData from './students.json';
import { supabase } from './supabaseClient';
import { PALETTES, PALETTE_STORAGE_KEY, DEFAULT_PALETTE, isPaletteTheme, isDarkPaletteTheme } from './themes';
import Login from './Login';

const FONT_STORAGE_KEY = 'evalwiz-font-preference';
const VIEW_MODE_STORAGE_KEY = 'marks-app-view-mode';
const ACTIVE_SECTION_STORAGE_KEY = 'marks-app-active-section';
const DEFAULT_REVIEWER = 'Dr. Vandhana S';
const REVIEWER_OPTIONS = ['Dr. Vandhana S', 'Prof. Neethu M R'];
const FONT_OPTIONS = [
  { value: 'sans', label: 'Sans' },
  { value: 'serif', label: 'Serif' },
];

function getScopedStorageKey(baseKey, userId, suffix = '') {
  if (!userId) return null;
  return `${baseKey}:${userId}${suffix ? `:${suffix}` : ''}`;
}

function buildDefaultReviewerState(sections) {
  return sections.reduce((acc, section) => {
    acc[section] = DEFAULT_REVIEWER;
    return acc;
  }, {});
}

function isMissingTableError(error, tableName) {
  const message = error?.message || '';
  return (
    error?.code === 'PGRST205' ||
    message.includes(`Could not find the table 'public.${tableName}'`) ||
    (message.includes(tableName) && message.includes('schema cache'))
  );
}

function PasswordIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none">
      <path
        d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="16.5" cy="7.5" r=".5" fill="currentColor" />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none">
      <path
        d="m16 17 5-5-5-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M21 12H9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PaletteIcon({ kind }) {
  const commonProps = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '2',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };

  if (kind === 'sun') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="12" cy="12" r="4" {...commonProps} />
        <path d="M12 2v2" {...commonProps} />
        <path d="M12 20v2" {...commonProps} />
        <path d="m4.93 4.93 1.41 1.41" {...commonProps} />
        <path d="m17.66 17.66 1.41 1.41" {...commonProps} />
        <path d="M2 12h2" {...commonProps} />
        <path d="M20 12h2" {...commonProps} />
        <path d="m6.34 17.66-1.41 1.41" {...commonProps} />
        <path d="m19.07 4.93-1.41 1.41" {...commonProps} />
      </svg>
    );
  }

  if (kind === 'waves') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M2 6c1.5 0 1.5 2 3 2s1.5-2 3-2 1.5 2 3 2 1.5-2 3-2 1.5 2 3 2 1.5-2 3-2" {...commonProps} />
        <path d="M2 12c1.5 0 1.5 2 3 2s1.5-2 3-2 1.5 2 3 2 1.5-2 3-2 1.5 2 3 2 1.5-2 3-2" {...commonProps} />
        <path d="M2 18c1.5 0 1.5 2 3 2s1.5-2 3-2 1.5 2 3 2 1.5-2 3-2 1.5 2 3 2 1.5-2 3-2" {...commonProps} />
      </svg>
    );
  }

  if (kind === 'trees') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="m10 10-3 3h6l-3-3Z" {...commonProps} />
        <path d="m10 5-4 5h8l-4-5Z" {...commonProps} />
        <path d="M10 13v7" {...commonProps} />
        <path d="m18 12-2.5 3h5L18 12Z" {...commonProps} />
        <path d="m18 8-3.5 4h7L18 8Z" {...commonProps} />
        <path d="M18 15v5" {...commonProps} />
      </svg>
    );
  }

  if (kind === 'sparkles') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="m12 3 1.9 4.6L18.5 9l-4.6 1.4L12 15l-1.9-4.6L5.5 9l4.6-1.4L12 3Z" {...commonProps} />
        <path d="m19 14 .9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9L19 14Z" {...commonProps} />
        <path d="m5 14 .9 2.1L8 17l-2.1.9L5 20l-.9-2.1L2 17l2.1-.9L5 14Z" {...commonProps} />
      </svg>
    );
  }

  if (kind === 'flame') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M12 3s4 3.2 4 7.2c0 2.2-1.4 3.6-2.7 4.9A4.2 4.2 0 0 0 12 18.5a4.5 4.5 0 0 1-4.5-4.5C7.5 8.8 12 3 12 3Z" {...commonProps} />
        <path d="M12 13.5c1.1.8 1.7 1.8 1.7 3A2.7 2.7 0 0 1 11 19.2a2.7 2.7 0 0 1-2.7-2.7c0-1.7 1.2-2.7 2.2-3.7.5-.5 1-1 1.5-1.6Z" {...commonProps} />
      </svg>
    );
  }

  if (kind === 'moon') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M12 3a7.5 7.5 0 1 0 9 9A9 9 0 1 1 12 3Z" {...commonProps} />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="9" {...commonProps} />
      <path d="M12 7v10M7 12h10" {...commonProps} />
    </svg>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [viewMode, setViewMode] = useState('sheet'); // 'sheet' or 'bulk'

  const allSections = Object.keys(studentsData);
  const [sections, setSections] = useState([]);
  const [activeSection, setActiveSection] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [reviewerName, setReviewerName] = useState('Dr. Vandhana S');
  const [reviewersBySection, setReviewersBySection] = useState(() => buildDefaultReviewerState(allSections));
  const [debugMsg, setDebugMsg] = useState('');
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showThemeStudio, setShowThemeStudio] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordFeedback, setPasswordFeedback] = useState(null);
  const [passwordUpdating, setPasswordUpdating] = useState(false);
  const [pdfExporting, setPdfExporting] = useState(false);
  const [theme, setTheme] = useState(DEFAULT_PALETTE);
  const [fontPreference, setFontPreference] = useState('serif');
  const accountMenuRef = useRef(null);
  const sheetExportRef = useRef(null);
  const userId = session?.user?.id ?? null;

  useEffect(() => {
    if (!activeSection) return;
    setReviewerName(reviewersBySection[activeSection] || DEFAULT_REVIEWER);
  }, [activeSection, reviewersBySection]);

  useEffect(() => {
    if (!userId) return;

    const themeStorageKey = getScopedStorageKey(PALETTE_STORAGE_KEY, userId);
    const storedTheme = themeStorageKey ? window.localStorage.getItem(themeStorageKey) : null;
    if (isPaletteTheme(storedTheme)) {
      setTheme(storedTheme);
    } else {
      setTheme(DEFAULT_PALETTE);
    }

    const fontStorageKey = getScopedStorageKey(FONT_STORAGE_KEY, userId);
    const storedFont = fontStorageKey ? window.localStorage.getItem(fontStorageKey) : null;
    setFontPreference(storedFont === 'sans' || storedFont === 'serif' ? storedFont : 'serif');

    const viewModeStorageKey = getScopedStorageKey(VIEW_MODE_STORAGE_KEY, userId);
    const storedViewMode = viewModeStorageKey ? window.localStorage.getItem(viewModeStorageKey) : null;
    setViewMode(storedViewMode === 'bulk' ? 'bulk' : 'sheet');
  }, [userId]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.style.colorScheme = isDarkPaletteTheme(theme) ? 'dark' : 'light';
    const themeStorageKey = getScopedStorageKey(PALETTE_STORAGE_KEY, userId);
    if (themeStorageKey) {
      window.localStorage.setItem(themeStorageKey, theme);
    }
  }, [theme, userId]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.font = fontPreference;
    const fontStorageKey = getScopedStorageKey(FONT_STORAGE_KEY, userId);
    if (fontStorageKey) {
      window.localStorage.setItem(fontStorageKey, fontPreference);
    }
  }, [fontPreference, userId]);

  useEffect(() => {
    const viewModeStorageKey = getScopedStorageKey(VIEW_MODE_STORAGE_KEY, userId);
    if (viewModeStorageKey) {
      window.localStorage.setItem(viewModeStorageKey, viewMode);
    }
  }, [userId, viewMode]);

  useEffect(() => {
    if (!userId || !activeSection) return;
    const activeSectionStorageKey = getScopedStorageKey(ACTIVE_SECTION_STORAGE_KEY, userId);
    if (activeSectionStorageKey) {
      window.localStorage.setItem(activeSectionStorageKey, activeSection);
    }
  }, [activeSection, userId]);

  useEffect(() => {
    if (!showAccountMenu) return undefined;

    const handlePointerDown = (event) => {
      if (!accountMenuRef.current?.contains(event.target)) {
        setShowAccountMenu(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setShowAccountMenu(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showAccountMenu]);

  useEffect(() => {
    if (!showThemeStudio && !showPasswordDialog) return undefined;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setShowThemeStudio(false);
        setShowPasswordDialog(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showThemeStudio, showPasswordDialog]);
  
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
      const activeSectionStorageKey = getScopedStorageKey(ACTIVE_SECTION_STORAGE_KEY, sessionParam.user.id);
      const savedSection = activeSectionStorageKey ? window.localStorage.getItem(activeSectionStorageKey) : null;
      const nextSection = savedSection && allowed.includes(savedSection) ? savedSection : allowed[0];
      setActiveSection(nextSection);
      await Promise.all([
        fetchMarks(),
        fetchSectionReviewers(allowed),
      ]);
      setLoadingInitial(false);
    } else {
      setReviewersBySection(buildDefaultReviewerState(allSections));
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

  const handleLoginComplete = async (sessionParam) => {
    setLoadingInitial(true);
    await initializeAuthAndData(sessionParam);
  };

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
  };

  const fetchSectionReviewers = async (allowedSections) => {
     if (!supabase || !allowedSections?.length) {
       setReviewersBySection(buildDefaultReviewerState(allSections));
       return;
     }

     const defaults = buildDefaultReviewerState(allSections);
     const { data, error } = await supabase
       .from('section_reviewers')
       .select('section, reviewer_name')
       .in('section', allowedSections);

     if (error) {
       setReviewersBySection(defaults);
       return;
     }

     const next = { ...defaults };
     data?.forEach((row) => {
       if (row.section) {
         next[row.section] = row.reviewer_name || DEFAULT_REVIEWER;
       }
     });
     setReviewersBySection(next);
  };

  const facultyNames = {
    'A': 'Dr. Malathi P',
    'B': 'Prof. G Krishna Priya',
    'C': 'Prof. Anisha Radhakrishnan',
    'D': 'Prof. Vedaj J Padman',
    'E': 'Dr. Suchithra M',
    'F': 'Prof. G Krishna Priya',
    'G': 'Dr. T Senthilkumar',
    'H': 'Prof. Anisha Radhakrishnan'
  };
  const activeExaminer = facultyNames[activeSection] || 'Dr. Malathi P';

  const knownFacultyProfiles = {
    'jp_vedaj@cb.amrita.edu': 'Prof. Vedaj J Padman',
    'p_malathy@cb.amrita.edu': 'Dr. Malathi P',
    'g_krishnapriya@cb.amrita.edu': 'Prof. G Krishna Priya',
    'r_anisha@cb.amrita.edu': 'Prof. Anisha Radhakrishnan',
    'm_suchithra@cb.amrita.edu': 'Dr. Suchithra M',
    't_senthilkumar@cb.amrita.edu': 'Dr. T Senthilkumar',
  };

  const displayName =
    [session?.user?.user_metadata?.title, session?.user?.user_metadata?.firstName, session?.user?.user_metadata?.lastName]
      .filter(Boolean)
      .join(' ')
      .trim() ||
    session?.user?.user_metadata?.full_name ||
    session?.user?.user_metadata?.name ||
    knownFacultyProfiles[session?.user?.email ?? ''] ||
    session?.user?.email?.split('@')[0]?.replace(/[._]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()) ||
    'Faculty User';

  const displayInitials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
  const activePalette = PALETTES.find((palette) => palette.value === theme) ?? PALETTES[0];
  const lightPalettes = PALETTES.filter((palette) => !isDarkPaletteTheme(palette.value));
  const darkPalettes = PALETTES.filter((palette) => isDarkPaletteTheme(palette.value));
  const roleLabel = userRole === 'admin' ? 'Administrator' : 'Faculty';

  if (loadingInitial) return <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>Loading Secure Portal...</div>;
  if (!session) return <Login onLoginComplete={handleLoginComplete} />;
  
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

  const handleSavePdf = async () => {
    if (pdfExporting || !sheetExportRef.current) return;

    const sheetNodes = Array.from(sheetExportRef.current.querySelectorAll('.sheet'));
    if (!sheetNodes.length) return;

    setPdfExporting(true);

    let exportRoot = null;

    try {
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);

      exportRoot = document.createElement('div');
      Object.assign(exportRoot.style, {
        position: 'fixed',
        left: '-100000px',
        top: '0',
        width: '210mm',
        padding: '0',
        margin: '0',
        background: '#ffffff',
        zIndex: '-1',
      });
      document.body.appendChild(exportRoot);

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      for (let index = 0; index < sheetNodes.length; index += 1) {
        const sheetNode = sheetNodes[index];
        const clone = sheetNode.cloneNode(true);
        clone.style.margin = '0';
        clone.style.boxShadow = 'none';
        clone.style.pageBreakAfter = 'auto';
        clone.style.breakAfter = 'auto';

        clone.querySelectorAll('.mark-input').forEach((input) => {
          const exportValue = document.createElement('div');
          exportValue.textContent = input.value || '';
          Object.assign(exportValue.style, {
            width: '100%',
            minHeight: '18px',
            border: 'none',
            background: 'transparent',
            fontFamily: 'inherit',
            fontSize: 'inherit',
            lineHeight: 'inherit',
            textAlign: 'center',
            padding: '0',
          });
          input.replaceWith(exportValue);
        });

        exportRoot.appendChild(clone);

        // Let layout settle before rasterizing the cloned A4 sheet.
        await new Promise((resolve) => window.requestAnimationFrame(() => resolve()));

        const canvas = await html2canvas(clone, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
        });

        if (index > 0) {
          pdf.addPage();
        }

        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
        exportRoot.removeChild(clone);
      }

      pdf.save(`marks_sheet_vi_${activeSection}.pdf`);
    } catch (error) {
      window.alert(`Unable to export PDF: ${error?.message || 'Unexpected error'}`);
    } finally {
      if (exportRoot?.parentNode) {
        exportRoot.parentNode.removeChild(exportRoot);
      }
      setPdfExporting(false);
    }
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

    if (!currentPassword) {
      setPasswordFeedback({ type: 'error', message: 'Enter your current password to continue.' });
      return;
    }

    if (newPassword.length < 8) {
      setPasswordFeedback({ type: 'error', message: 'Password must be at least 8 characters long.' });
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
    const { error: currentPasswordError } = await supabase.auth.signInWithPassword({
      email: session.user.email,
      password: currentPassword,
    });

    if (currentPasswordError) {
      setPasswordUpdating(false);
      setPasswordFeedback({ type: 'error', message: 'Current password is incorrect.' });
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordUpdating(false);

    if (error) {
      setPasswordFeedback({ type: 'error', message: error.message });
      return;
    }

    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordFeedback({ type: 'success', message: 'Password updated successfully.' });
    setShowAccountMenu(false);
    setShowPasswordDialog(false);
  };

  const handleReviewerSelect = async (reviewer) => {
    const previousReviewer = reviewerName;
    setReviewerName(reviewer);
    setReviewersBySection((prev) => ({
      ...prev,
      [activeSection]: reviewer,
    }));

    if (supabase && activeSection && session?.user?.id) {
      const { error } = await supabase.from('section_reviewers').upsert({
        section: activeSection,
        reviewer_name: reviewer,
        updated_by: session.user.id,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        if (isMissingTableError(error, 'section_reviewers')) {
          window.alert('Reviewer persistence is not enabled in Supabase yet. Run the `section_reviewers` SQL in the Supabase SQL editor once, and reviewer choices will persist across logins.');
          return;
        }

        setReviewersBySection((prev) => ({
          ...prev,
          [activeSection]: previousReviewer,
        }));
        setReviewerName(previousReviewer);
        window.alert(`Unable to save reviewer selection: ${error.message}`);
        return;
      }
    }
  };

  const showUtilityRail = viewMode === 'sheet';

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

        <div className="sidebar-field sidebar-view-switch">
          <label>Select View</label>
          <div className="view-toggle" role="tablist" aria-label="Select view">
            <button
              type="button"
              className={`view-toggle-button ${viewMode === 'sheet' ? 'view-toggle-button-active' : ''}`}
              onClick={() => setViewMode('sheet')}
              aria-pressed={viewMode === 'sheet'}
            >
              Sheet
            </button>
            <button
              type="button"
              className={`view-toggle-button ${viewMode === 'bulk' ? 'view-toggle-button-active' : ''}`}
              onClick={() => setViewMode('bulk')}
              aria-pressed={viewMode === 'bulk'}
            >
              CSV
            </button>
          </div>
        </div>

        <div className="sidebar-field">
          <label>Select Section</label>
          <div className="section-toggle" role="tablist" aria-label="Select section">
            {sections.map(sec => {
              const isActive = sec === activeSection;
              return (
                <button
                  key={sec}
                  type="button"
                  className={`section-toggle-button ${isActive ? 'section-toggle-button-active' : ''}`}
                  onClick={() => setActiveSection(sec)}
                  aria-pressed={isActive}
                >
                  VI {sec}
                </button>
              );
            })}
          </div>
        </div>

      </aside>

      <main className="main-content">
        <div className="top-navbar no-print">
          <div className="top-navbar-actions">
            <div className="top-navbar-header-copy">
              <span className="sidebar-status-label">Marks Workspace</span>
              <div className="top-navbar-header-label">Section VI {activeSection} · {viewMode === 'sheet' ? 'Marks Entry' : 'CSV Import'}</div>
            </div>

            <div className="top-navbar-account" ref={accountMenuRef}>
              <button
                type="button"
                className="top-navbar-user-trigger"
                onClick={() => {
                  setShowAccountMenu(prev => !prev);
                  setPasswordFeedback(null);
                }}
                aria-expanded={showAccountMenu}
              >
                <div className="top-navbar-avatar" aria-hidden="true">{displayInitials || 'F'}</div>
                <div className="top-navbar-identity-copy">
                  <strong>{displayName}</strong>
                  <div className="top-navbar-identity-meta">{roleLabel}</div>
                </div>
              </button>

              {showAccountMenu && (
                <div className="top-navbar-menu">
                  <div className="top-navbar-menu-header">
                    <div className="top-navbar-menu-name">{displayName}</div>
                  </div>

                  <div className="top-navbar-menu-section">
                    <div className="top-navbar-menu-section-label">Appearance</div>

                    <button
                      type="button"
                      className="appearance-launch-button"
                      onClick={() => {
                        setShowAccountMenu(false);
                        setShowThemeStudio(true);
                      }}
                    >
                      <span className="appearance-launch-swatch" style={{ backgroundImage: activePalette.previewStyle }} />
                      <span className="appearance-launch-copy">
                        <strong>{activePalette.label}</strong>
                        <span>{activePalette.mood} theme</span>
                      </span>
                      <span className="appearance-launch-meta">Open Theme Studio</span>
                    </button>

                    <div className="font-preference-block">
                      <div className="font-preference-label-row">
                        <span className="font-preference-label">Font</span>
                        <span className="font-preference-value">{fontPreference === 'sans' ? 'Sans' : 'Serif'}</span>
                      </div>
                      <div className="font-toggle" role="tablist" aria-label="Font style">
                        {FONT_OPTIONS.map(({ value, label }) => {
                          const isActive = fontPreference === value;
                          return (
                            <button
                              key={value}
                              type="button"
                              className={`font-toggle-button ${isActive ? 'font-toggle-button-active' : ''}`}
                              onClick={() => setFontPreference(value)}
                              aria-pressed={isActive}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="top-navbar-menu-actions">
                    <button
                      type="button"
                      className="top-navbar-action-item"
                      onClick={() => {
                        setShowAccountMenu(false);
                        setPasswordFeedback(null);
                        setShowPasswordDialog(true);
                      }}
                    >
                      <span className="top-navbar-action-icon"><PasswordIcon /></span>
                      <span className="top-navbar-action-label">Change Password</span>
                    </button>

                    <button
                      type="button"
                      className="top-navbar-action-item top-navbar-action-item-danger"
                      onClick={async () => {
                        setShowAccountMenu(false);
                        await supabase.auth.signOut();
                      }}
                    >
                      <span className="top-navbar-action-icon"><SignOutIcon /></span>
                      <span className="top-navbar-action-label">Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="workspace-layout">
          <div className="workspace-canvas">
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
            <div ref={sheetExportRef}>
              {studentChunks.map((chunk, chunkIndex) => (
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
              ))}
            </div>
          )}
          </div>

          {showUtilityRail && (
            <aside className="utility-rail no-print">
              {viewMode === 'sheet' && (
                <section className="utility-card utility-card-combined">
                  <div className="utility-card-label">Sheet Tools</div>
                  <h3>Review and Export</h3>

                  <div className="utility-subsection">
                    <div className="utility-subsection-label">Reviewer</div>
                    <div className="reviewer-toggle" role="tablist" aria-label="Select reviewer">
                      {REVIEWER_OPTIONS.map((reviewer) => {
                        const isActive = reviewerName === reviewer;
                        return (
                          <button
                            key={reviewer}
                            type="button"
                            className={`reviewer-toggle-button ${isActive ? 'reviewer-toggle-button-active' : ''}`}
                            onClick={() => handleReviewerSelect(reviewer)}
                            aria-pressed={isActive}
                          >
                            {reviewer}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="utility-subsection utility-subsection-accent">
                    <div className="utility-subsection-label">Export</div>
                    <button onClick={handleSavePdf} className="btn-primary utility-card-button utility-pill-button" disabled={pdfExporting}>
                      {pdfExporting ? 'Saving PDF...' : 'Save PDF'}
                    </button>
                  </div>

                  {userRole === 'admin' && (
                    <div className="utility-subsection utility-subsection-warning">
                      <div className="utility-subsection-label">Section Records</div>
                      <button type="button" onClick={handleDeleteSection} className="utility-danger-button">
                        Delete Saved Marks
                      </button>
                    </div>
                  )}
                </section>
              )}
            </aside>
          )}
        </div>

      {showThemeStudio && (
        <div className="context-overlay no-print" onClick={() => setShowThemeStudio(false)}>
          <div
            className="context-dialog theme-studio-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="theme-studio-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="context-dialog-header theme-studio-header">
              <div>
                <h3 id="theme-studio-title">Theme Studio</h3>
                <p>Pick the atmosphere you want across the workspace. Light palettes stay bright and academic, while dark palettes lean more immersive and cinematic.</p>
              </div>
              <button type="button" className="context-dialog-close" onClick={() => setShowThemeStudio(false)}>
                Close
              </button>
            </div>

            <div className="theme-studio-layout">
              <div className="theme-studio-sidebar-pane">
                <div
                  className="theme-studio-highlight theme-studio-highlight-portal"
                  style={{
                    backgroundColor: activePalette.surface,
                    borderColor: activePalette.border,
                    boxShadow: `0 24px 48px -36px ${activePalette.accent}66`,
                  }}
                >
                  <span className="theme-studio-preview" style={{ backgroundImage: activePalette.previewStyle }} />
                  <div className="theme-studio-copy">
                    <div className="theme-studio-topline">
                      <div className="theme-studio-title-row">
                        <span className="theme-studio-icon" style={{ color: activePalette.mutedText }}>
                          <PaletteIcon kind={activePalette.icon} />
                        </span>
                        <strong style={{ color: activePalette.text }}>{activePalette.label}</strong>
                      </div>
                      <span
                        className="theme-studio-active-pill"
                        style={{ backgroundColor: `${activePalette.accent}22`, color: activePalette.accent }}
                      >
                        Active
                      </span>
                    </div>
                    <p style={{ color: activePalette.mutedText }}>{activePalette.description}</p>
                    <div className="theme-studio-footer">
                      <div className="theme-studio-swatches">
                        {[activePalette.accent, activePalette.border, activePalette.surface].map((color) => (
                          <span
                            key={color}
                            className="theme-studio-swatch"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <span className="theme-studio-mood" style={{ color: activePalette.accent }}>
                        {activePalette.mood}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="theme-studio-scroll-pane">
                <div className="theme-picker-group">
                  <div className="theme-picker-group-heading">Light Palettes</div>
                  <div className="theme-picker-group-copy">Brighter surfaces for daytime work, reports, and calmer reading.</div>
                  <div className="theme-picker-grid theme-picker-grid-portal">
                    {lightPalettes.map((palette) => {
                      const isActive = palette.value === theme;
                      return (
                        <button
                          key={palette.value}
                          type="button"
                          className={`theme-picker-card theme-picker-card-portal ${isActive ? 'theme-picker-card-active' : ''}`}
                          onClick={() => setTheme(palette.value)}
                          style={{
                            backgroundColor: palette.surface,
                            borderColor: isActive ? palette.accent : palette.border,
                            boxShadow: isActive
                              ? `0 22px 44px -34px ${palette.accent}77`
                              : '0 14px 30px -26px rgba(15, 23, 42, 0.4)',
                          }}
                        >
                          <div className="theme-picker-preview-shell">
                            <span className="theme-picker-preview" style={{ backgroundImage: palette.previewStyle }} />
                            <div className="theme-picker-overlay">
                              <span
                                className="theme-picker-chip theme-picker-chip-portal"
                                style={{ backgroundColor: `${palette.surface}dd`, color: palette.accent, borderColor: palette.border }}
                              >
                                {palette.mood}
                              </span>
                              {isActive ? <span className="theme-picker-check" style={{ backgroundColor: palette.accent, color: palette.surface }}>✓</span> : null}
                            </div>
                          </div>
                          <div className="theme-picker-meta-row">
                            <span className="theme-studio-icon" style={{ color: palette.mutedText }}>
                              <PaletteIcon kind={palette.icon} />
                            </span>
                            <span className="theme-picker-name" style={{ color: palette.text }}>{palette.label}</span>
                          </div>
                          <span className="theme-picker-description" style={{ color: palette.mutedText }}>{palette.description}</span>
                          <div className="theme-picker-footer">
                            <div className="theme-picker-swatches">
                              {[palette.accent, palette.border, palette.surface].map((color) => (
                                <span key={color} className="theme-picker-swatch" style={{ backgroundColor: color }} />
                              ))}
                            </div>
                            <span className="theme-picker-state" style={{ color: palette.accent, opacity: isActive ? 1 : 0.84 }}>
                              {isActive ? 'Currently active' : 'Use palette'}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="theme-picker-group theme-picker-group-offset">
                  <div className="theme-picker-group-heading">Dark Palettes</div>
                  <div className="theme-picker-group-copy">Deeper contrast for immersive dashboards and late-evening work.</div>
                  <div className="theme-picker-grid theme-picker-grid-portal">
                    {darkPalettes.map((palette) => {
                      const isActive = palette.value === theme;
                      return (
                        <button
                          key={palette.value}
                          type="button"
                          className={`theme-picker-card theme-picker-card-portal ${isActive ? 'theme-picker-card-active' : ''}`}
                          onClick={() => setTheme(palette.value)}
                          style={{
                            backgroundColor: palette.surface,
                            borderColor: isActive ? palette.accent : palette.border,
                            boxShadow: isActive
                              ? `0 22px 44px -34px ${palette.accent}77`
                              : '0 14px 30px -26px rgba(15, 23, 42, 0.4)',
                          }}
                        >
                          <div className="theme-picker-preview-shell">
                            <span className="theme-picker-preview" style={{ backgroundImage: palette.previewStyle }} />
                            <div className="theme-picker-overlay">
                              <span
                                className="theme-picker-chip theme-picker-chip-portal"
                                style={{ backgroundColor: `${palette.surface}dd`, color: palette.accent, borderColor: palette.border }}
                              >
                                {palette.mood}
                              </span>
                              {isActive ? <span className="theme-picker-check" style={{ backgroundColor: palette.accent, color: palette.surface }}>✓</span> : null}
                            </div>
                          </div>
                          <div className="theme-picker-meta-row">
                            <span className="theme-studio-icon" style={{ color: palette.mutedText }}>
                              <PaletteIcon kind={palette.icon} />
                            </span>
                            <span className="theme-picker-name" style={{ color: palette.text }}>{palette.label}</span>
                          </div>
                          <span className="theme-picker-description" style={{ color: palette.mutedText }}>{palette.description}</span>
                          <div className="theme-picker-footer">
                            <div className="theme-picker-swatches">
                              {[palette.accent, palette.border, palette.surface].map((color) => (
                                <span key={color} className="theme-picker-swatch" style={{ backgroundColor: color }} />
                              ))}
                            </div>
                            <span className="theme-picker-state" style={{ color: palette.accent, opacity: isActive ? 1 : 0.84 }}>
                              {isActive ? 'Currently active' : 'Use palette'}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPasswordDialog && (
        <div className="context-overlay no-print" onClick={() => setShowPasswordDialog(false)}>
          <div
            className="context-dialog password-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="password-dialog-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="context-dialog-header">
              <div>
                <h3 id="password-dialog-title">Change Password</h3>
                <p>Update your own account password. Use at least 8 characters.</p>
              </div>
              <button type="button" className="context-dialog-close" onClick={() => setShowPasswordDialog(false)}>
                Close
              </button>
            </div>

            <div className="top-navbar-password-wrap">
              <form onSubmit={handlePasswordChange} className="password-form">
                <label className="password-field">
                  <span className="password-field-label">Current Password</span>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    autoComplete="current-password"
                    required
                  />
                </label>

                <label className="password-field">
                  <span className="password-field-label">New Password</span>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Enter a new password"
                    autoComplete="new-password"
                    minLength="8"
                    required
                  />
                </label>

                <label className="password-field">
                  <span className="password-field-label">Confirm New Password</span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter the new password"
                    autoComplete="new-password"
                    minLength="8"
                    required
                  />
                </label>

                <div className="password-dialog-footer">
                  <button type="submit" className="btn-primary top-navbar-save" disabled={passwordUpdating}>
                    {passwordUpdating ? 'Saving...' : 'Update Password'}
                  </button>
                </div>
              </form>

              {passwordFeedback && (
                <div className={`password-feedback ${passwordFeedback.type === 'error' ? 'password-feedback-error' : 'password-feedback-success'}`}>
                  {passwordFeedback.message}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </main>
    </div>
  );
}
