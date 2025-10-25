# Session 2: Oracle PRO Integration - Add Practice Live Feature

## Objective
Add optional "Practice Live Interview" button to Oracle PRO that saves sessions to Supabase and redirects to Interview Coach, while maintaining full backward compatibility.

## Context
- Session 1 completed: Supabase table exists and tested ✅
- Oracle PRO currently uses only localStorage
- All existing functionality must remain unchanged
- This is purely additive (new feature)

## Requirements

### Critical Rules
1. ✅ All existing Oracle PRO features must continue working
2. ✅ localStorage must continue being the primary storage
3. ✅ Supabase save is OPTIONAL (only on button click)
4. ✅ If Supabase fails, show error but don't break app
5. ✅ New button should be visually distinct but not intrusive

## File Changes Overview

```
oracle-pro/
├── index.html          (MODIFY - add Supabase script)
├── app.js              (MODIFY - add new functions)
├── style.css           (MODIFY - add button styles)
└── .env                (CREATE - store Supabase keys)
```

## Tasks

### Task 1: Add Supabase Client to index.html

**File:** `index.html`

**Location:** Before the closing `</head>` tag

**Add this code:**

```html
<!-- Supabase Client for Interview Coach Integration -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script>
  // Initialize Supabase client
  window.supabaseClient = null;
  
  try {
    const SUPABASE_URL = 'https://snhezroznzsjcqqxpjpp.supabase.co';
    const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY_HERE'; // TODO: Replace with actual key
    
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ Supabase client initialized');
  } catch (error) {
    console.warn('⚠️ Supabase client failed to initialize:', error);
    // App continues to work without Supabase
  }
</script>
```

**Important:** Replace `'YOUR_ANON_KEY_HERE'` with your actual Supabase anon key from the Supabase dashboard.

---

### Task 2: Add Practice Live Button CSS

**File:** `style.css`

**Location:** At the end of the file

**Add this code:**

```css
/* ================================
   Practice Live Button Styling
   ================================ */

.practice-live-btn {
  background: linear-gradient(135deg, #2EB1BC 0%, #1E8C94 100%);
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 8px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(46, 177, 188, 0.3);
  font-size: 14px;
  width: 100%;
  margin-top: 8px;
}

.practice-live-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(46, 177, 188, 0.4);
  background: linear-gradient(135deg, #1E8C94 0%, #2EB1BC 100%);
}

.practice-live-btn:active {
  transform: translateY(0);
}

.practice-live-btn .btn-icon {
  font-size: 1.2em;
}

.practice-live-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

/* Loading state for practice button */
.practice-live-btn.loading {
  opacity: 0.7;
  pointer-events: none;
  position: relative;
}

.practice-live-btn.loading::after {
  content: '';
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 14px;
  height: 14px;
  border: 2px solid white;
  border-radius: 50%;
  border-top-color: transparent;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: translateY(-50%) rotate(360deg); }
}

/* Enhanced session card layout for new button */
.session-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 16px;
}

.session-actions-row {
  display: flex;
  gap: 8px;
}

.session-actions-row .btn-secondary {
  flex: 1;
}

/* Error message styling (if it doesn't exist) */
.error-message {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: #fee;
  border: 1px solid #fcc;
  color: #c00;
  padding: 16px 24px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  z-index: 9999;
  max-width: 500px;
  animation: slideDown 0.3s ease;
}

.error-message.hidden {
  display: none;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}
```

---

### Task 3: Update displaySavedSessions() in app.js

**File:** `app.js`

**Location:** Find the `displaySavedSessions()` function (around line 400-500)

**Find this section:**

```javascript
sessionCard.innerHTML = `
  <div class="session-card-header">
    <h3>${session.metadata?.jobTitle || 'Interview Session'}</h3>
    // ... existing code
  </div>
  // ... existing buttons
`;
```

**Replace the session card HTML with:**

```javascript
sessionCard.innerHTML = `
  <div class="session-card-header">
    <h3 class="session-title">${session.metadata?.jobTitle || 'Interview Session'}</h3>
    <span class="session-date">${this.formatDate(session.metadata?.createdAt)}</span>
  </div>
  
  <div class="session-stats">
    <span class="stat-item">
      <span class="stat-icon">📝</span>
      <span class="stat-value">${session.questions.length} questions</span>
    </span>
    <span class="stat-item">
      <span class="stat-icon">💡</span>
      <span class="stat-value">${Object.keys(session.answers || {}).length} SOAR answers</span>
    </span>
  </div>
  
  <div class="session-actions">
    <div class="session-actions-row">
      <button class="btn-secondary" onclick="oracleApp.viewSession('${session.id}')">
        View Details
      </button>
      <button class="btn-secondary" onclick="oracleApp.exportSession('${session.id}')">
        Export PDF
      </button>
    </div>
    
    <!-- NEW: Practice Live button -->
    <button class="btn-primary practice-live-btn" 
            onclick="oracleApp.practiceWithCoach('${session.id}')"
            title="Practice these questions with AI interviewer">
      <span class="btn-icon">🎙️</span>
      <span class="btn-text">Practice Live Interview</span>
    </button>
  </div>
`;
```

---

### Task 4: Add New Functions to app.js

**File:** `app.js`

**Location:** Add these functions inside the `OracleApp` class (before the closing bracket)

**Add this code:**

```javascript
  /**
   * Save session to Supabase and redirect to Interview Coach
   * This is the main integration point between Oracle PRO and Interview Coach
   */
  async practiceWithCoach(localSessionId) {
    // Check if Supabase is available
    if (!window.supabaseClient) {
      this.showError('Interview Coach integration is currently unavailable. Please try exporting this session instead.');
      return;
    }

    try {
      // Show loading state
      const button = event.target.closest('.practice-live-btn');
      if (button) {
        button.classList.add('loading');
        button.disabled = true;
      }

      // Get session from localStorage
      const session = this.savedSessions.find(s => s.id === localSessionId);
      
      if (!session) {
        throw new Error('Session not found');
      }

      // Get member email (from MemberPress)
      const memberEmail = this.getMemberEmail();
      
      if (!memberEmail) {
        throw new Error('Please log in to use Practice Live feature');
      }

      // Format questions for Interview Coach
      const formattedQuestions = this.formatQuestionsForCoach(session);

      // Save to Supabase
      console.log('Saving prep session to Supabase...');
      
      const { data: prepSession, error } = await window.supabaseClient
        .from('oracle_prep_sessions')
        .insert({
          member_email: memberEmail,
          job_description: session.jobDescription || '',
          job_title: session.metadata?.jobTitle || 'Practice Interview',
          company_name: session.companyName || '',
          role: session.role || '',
          experience_level: session.experienceLevel || '',
          questions: formattedQuestions,
          status: 'prepared',
          metadata: {
            oracle_session_id: session.id,
            generated_at: session.metadata?.createdAt || new Date().toISOString(),
            total_questions: formattedQuestions.length,
            has_soar_answers: Object.keys(session.answers || {}).length > 0,
            source: 'oracle_pro'
          }
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw new Error('Failed to save prep session');
      }

      console.log('✅ Prep session saved:', prepSession.id);

      // Track analytics
      this.trackEvent('practice_started', {
        session_id: localSessionId,
        prep_session_id: prepSession.id,
        question_count: formattedQuestions.length,
        has_answers: Object.keys(session.answers || {}).length > 0
      });

      // Redirect to Interview Coach
      const coachUrl = `https://igcareercoach.com/practice?prep_session=${prepSession.id}`;
      window.location.href = coachUrl;

    } catch (error) {
      console.error('Error starting practice:', error);
      
      // Show user-friendly error
      let errorMessage = 'Failed to start practice session. ';
      
      if (error.message.includes('log in')) {
        errorMessage += 'Please make sure you are logged in.';
      } else if (error.message.includes('not found')) {
        errorMessage += 'Session data not found.';
      } else {
        errorMessage += 'Please try again or export this session instead.';
      }
      
      this.showError(errorMessage);

      // Remove loading state
      const button = document.querySelector('.practice-live-btn.loading');
      if (button) {
        button.classList.remove('loading');
        button.disabled = false;
      }
    }
  }

  /**
   * Get member email from MemberPress
   */
  getMemberEmail() {
    // Try multiple sources for member email
    
    // 1. Check if MemberPress provides it globally
    if (window.memberPressUser && window.memberPressUser.email) {
      return window.memberPressUser.email;
    }
    
    // 2. Check localStorage (may be stored after login)
    const storedEmail = localStorage.getItem('member_email');
    if (storedEmail) {
      return storedEmail;
    }
    
    // 3. Check if user is logged in via WordPress
    if (window.wpUser && window.wpUser.email) {
      return window.wpUser.email;
    }
    
    // 4. Fallback: Check session storage
    const sessionEmail = sessionStorage.getItem('member_email');
    if (sessionEmail) {
      return sessionEmail;
    }
    
    // 5. Last resort: prompt user
    console.warn('Member email not found automatically');
    return null;
  }

  /**
   * Format questions for Interview Coach compatibility
   */
  formatQuestionsForCoach(session) {
    return session.questions.map((q, index) => {
      // Handle both string questions and object questions
      const questionText = typeof q === 'string' ? q : q.text || q;
      const category = q.category || this.categorizeQuestion(questionText);
      const difficulty = q.difficulty || 'Medium';

      return {
        text: questionText,
        category: category,
        difficulty: difficulty,
        order: index,
        // Include SOAR answer if it exists
        soar_answer: session.answers?.[index] || null
      };
    });
  }

  /**
   * Simple question categorization based on keywords
   */
  categorizeQuestion(text) {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('tell me about a time') || 
        lowerText.includes('describe a situation') ||
        lowerText.includes('give me an example')) {
      return 'Behavioral';
    }
    
    if (lowerText.includes('technical') || 
        lowerText.includes('how would you') ||
        lowerText.includes('design') ||
        lowerText.includes('implement')) {
      return 'Technical';
    }
    
    if (lowerText.includes('why') || 
        lowerText.includes('what motivates') ||
        lowerText.includes('where do you see')) {
      return 'Motivational';
    }
    
    return 'General';
  }
```

---

### Task 5: Ensure showError() Function Exists

**File:** `app.js`

**Check if this function exists. If not, add it:**

```javascript
  /**
   * Display error message to user
   */
  showError(message) {
    const errorElement = document.getElementById('globalError');
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.classList.remove('hidden');

      // Auto-hide after 5 seconds
      setTimeout(() => {
        errorElement.classList.add('hidden');
      }, 5000);
    } else {
      // Fallback to alert if element doesn't exist
      alert(message);
    }
  }
```

---

### Task 6: Add Global Error Element to HTML

**File:** `index.html`

**Location:** Near the top of the `<body>`, after the header

**Add if it doesn't exist:**

```html
<!-- Global Error Message Display -->
<div id="globalError" class="error-message hidden"></div>
```

---

## Testing Checklist

After implementation, verify these scenarios:

### Test 1: Existing Functionality (Nothing Should Break)
- [ ] Generate new questions - works ✅
- [ ] Create SOAR answers - works ✅
- [ ] Save session - works ✅
- [ ] View saved session - works ✅
- [ ] Export to PDF - works ✅
- [ ] Practice mode - works ✅
- [ ] All localStorage operations - work ✅

### Test 2: New Button Appearance
- [ ] "Practice Live Interview" button appears on saved sessions ✅
- [ ] Button is styled correctly (teal gradient) ✅
- [ ] Button has microphone icon and text ✅
- [ ] Hover effect works (lift + shadow) ✅
- [ ] Button is positioned below other buttons ✅

### Test 3: Practice Live - Happy Path
- [ ] Click "Practice Live Interview" ✅
- [ ] Button shows loading state (spinner) ✅
- [ ] Console shows "Saving prep session to Supabase..." ✅
- [ ] Console shows "✅ Prep session saved: [uuid]" ✅
- [ ] Redirects to `https://igcareercoach.com/practice?prep_session=[uuid]` ✅

### Test 4: Practice Live - Error Handling
- [ ] If Supabase unavailable: Shows error, app continues working ✅
- [ ] If not logged in: Shows "Please log in" error ✅
- [ ] If session not found: Shows error, doesn't crash ✅
- [ ] If network error: Shows error, button returns to normal ✅
- [ ] Error message auto-hides after 5 seconds ✅

### Test 5: Data Integrity
- [ ] Questions saved correctly to Supabase ✅
- [ ] SOAR answers included (if they exist) ✅
- [ ] Job title, company, role transferred ✅
- [ ] Metadata includes `oracle_session_id` ✅
- [ ] Member email captured correctly ✅

---

## Success Criteria

✅ All existing Oracle PRO features work unchanged
✅ New "Practice Live" button appears on saved sessions
✅ Button click saves session to Supabase
✅ Button click redirects to Interview Coach
✅ Error handling works gracefully
✅ No console errors in normal operation
✅ localStorage remains primary storage
✅ App works offline (except Practice Live feature)

---

## Rollback Plan

If anything goes wrong, you can easily revert:

1. **Remove Supabase script tag** from `index.html`
2. **Remove Practice Live button** from session card HTML
3. **Comment out the new functions** in `app.js`
4. **Clear browser cache**
5. App returns to 100% original state ✅

---

## Next Steps

After this session is complete and tested:
- **Session 3:** Update Interview Coach to receive Oracle PRO sessions
- Test complete end-to-end flow
- Monitor Supabase usage
- Gather user feedback

---

**Status:** Ready for implementation
**Estimated Time:** 2-3 hours
**Difficulty:** Medium
**Risk Level:** Low (all changes are additive)
