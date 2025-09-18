// Interview Oracle PRO - JavaScript Application

class InterviewOraclePro {
  constructor() {
    this.currentTab = 'generate';
    this.currentQuestions = {
      behavioral: [],
      technical: [],
      company: []
    };
    this.currentAnswers = [];
    this.selectedQuestions = new Set();
    this.currentSession = null;
    this.savedSessions = [];
    this.practiceSession = null;
    this.stats = this.loadStats();

    this.init();
  }

  init() {
    this.setupEventListeners();
    this.loadSavedSessions();
    this.updateStatsDisplay();
    this.checkMemberStatus();
  }

  // ==================== EVENT LISTENERS ====================
  setupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
    });

    // Form elements
    const jobDescInput = document.getElementById('jobDescription');
    const charCounter = document.getElementById('charCounter');

    if (jobDescInput) {
      jobDescInput.addEventListener('input', (e) => this.updateCharCounter(e));
    }

    // Generate button
    const predictButton = document.getElementById('predictButton');
    if (predictButton) {
      predictButton.addEventListener('click', () => this.generateQuestions());
    }

    // Results actions
    const selectAllBtn = document.getElementById('selectAllBtn');
    if (selectAllBtn) {
      selectAllBtn.addEventListener('click', () => this.selectAllQuestions());
    }

    const generateAnswersBtn = document.getElementById('generateAnswersBtn');
    if (generateAnswersBtn) {
      generateAnswersBtn.addEventListener('click', () => this.generateAnswers());
    }

    const saveSessionBtn = document.getElementById('saveSessionBtn');
    if (saveSessionBtn) {
      saveSessionBtn.addEventListener('click', () => this.saveSession());
    }

    // Category select buttons
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('select-category-btn')) {
        this.selectCategory(e.target.dataset.category);
      }
    });

    // Answer style buttons
    document.querySelectorAll('.style-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.selectAnswerStyle(e.target.dataset.style));
    });

    // Practice mode
    const startPracticeBtn = document.getElementById('startPracticeBtn');
    if (startPracticeBtn) {
      startPracticeBtn.addEventListener('click', () => this.startPractice());
    }

    const pauseBtn = document.getElementById('pauseBtn');
    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => this.pausePractice());
    }

    const nextBtn = document.getElementById('nextBtn');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => this.nextQuestion());
    }

    const endPracticeBtn = document.getElementById('endPracticeBtn');
    if (endPracticeBtn) {
      endPracticeBtn.addEventListener('click', () => this.endPractice());
    }

    const newSessionBtn = document.getElementById('newSessionBtn');
    if (newSessionBtn) {
      newSessionBtn.addEventListener('click', () => this.startNewPracticeSession());
    }
  }

  // ==================== TAB MANAGEMENT ====================
  switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');

    this.currentTab = tabName;

    // Load tab-specific content
    switch (tabName) {
      case 'saved':
        this.loadSavedSessions();
        break;
      case 'stats':
        this.updateStatsDisplay();
        break;
      case 'answers':
        this.updateSelectedQuestions();
        break;
    }

    // Track analytics
    if (typeof gtag !== 'undefined') {
      gtag('event', 'tab_switch', { tab_name: tabName });
    }
  }

  // ==================== FORM HANDLING ====================
  updateCharCounter(event) {
    const length = event.target.value.length;
    const counter = document.getElementById('charCounter');
    const maxLength = 3000;

    counter.textContent = `${length} / ${maxLength}`;
    counter.classList.remove('warning', 'error');

    if (length > maxLength * 0.8) {
      counter.classList.add('warning');
    }
    if (length >= maxLength) {
      counter.classList.add('error');
    }
  }

  // ==================== QUESTION GENERATION ====================
  async generateQuestions() {
    const jobDescription = document.getElementById('jobDescription').value.trim();
    const role = document.getElementById('roleSelector').value;
    const experienceLevel = document.getElementById('experienceLevel').value;
    const companyName = document.getElementById('companyName').value.trim();

    if (!jobDescription) {
      this.showError('Please paste a job description');
      return;
    }

    if (jobDescription.length < 50) {
      this.showError('Please provide a more detailed job description (at least 50 characters)');
      return;
    }

    // Show loading state
    this.setLoadingState(true);

    try {
      const response = await fetch('/.netlify/functions/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobDescription,
          role,
          experienceLevel,
          companyName
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate questions');
      }

      const result = await response.json();
      this.currentQuestions = result;

      this.displayQuestions();
      this.showResults();

      // Update stats
      this.stats.totalQuestions += (result.behavioral?.length || 0) +
                                   (result.technical?.length || 0) +
                                   (result.company?.length || 0);
      this.saveStats();

      // Track analytics
      if (typeof gtag !== 'undefined') {
        gtag('event', 'questions_generated', {
          role: role,
          experience_level: experienceLevel,
          question_count: this.getTotalQuestionCount()
        });
      }

    } catch (error) {
      console.error('Question generation error:', error);
      this.showError('An error occurred generating questions. Please try again.');
    } finally {
      this.setLoadingState(false);
    }
  }

  displayQuestions() {
    this.displayQuestionCategory('behavioralQuestions', this.currentQuestions.behavioral || []);
    this.displayQuestionCategory('technicalQuestions', this.currentQuestions.technical || []);
    this.displayQuestionCategory('companyQuestions', this.currentQuestions.company || []);
  }

  displayQuestionCategory(elementId, questions) {
    const container = document.getElementById(elementId);
    if (!container) return;

    container.innerHTML = '';
    questions.forEach((q, i) => {
      const li = document.createElement('li');
      li.className = 'question-item';
      li.innerHTML = `
        <input type="checkbox" class="question-checkbox" data-category="${elementId.replace('Questions', '')}" data-index="${i}">
        <div class="question-number">Question ${i + 1}</div>
        <div class="question-text">${q.text}</div>
        <div class="question-meta">
          <span class="confidence-tag">${q.confidence}</span>
          <span class="difficulty-tag">PRO</span>
        </div>
      `;
      container.appendChild(li);

      // Add checkbox listener
      const checkbox = li.querySelector('.question-checkbox');
      checkbox.addEventListener('change', (e) => this.handleQuestionSelect(e));
    });
  }

  handleQuestionSelect(event) {
    const checkbox = event.target;
    const questionId = `${checkbox.dataset.category}-${checkbox.dataset.index}`;
    const questionItem = checkbox.closest('.question-item');

    if (checkbox.checked) {
      this.selectedQuestions.add(questionId);
      questionItem.classList.add('selected');
    } else {
      this.selectedQuestions.delete(questionId);
      questionItem.classList.remove('selected');
    }

    this.updateSelectedQuestions();
  }

  selectAllQuestions() {
    const checkboxes = document.querySelectorAll('.question-checkbox');
    const allSelected = Array.from(checkboxes).every(cb => cb.checked);

    checkboxes.forEach(checkbox => {
      checkbox.checked = !allSelected;
      this.handleQuestionSelect({ target: checkbox });
    });
  }

  selectCategory(category) {
    const checkboxes = document.querySelectorAll(`[data-category="${category}"]`);
    const allSelected = Array.from(checkboxes).every(cb => cb.checked);

    checkboxes.forEach(checkbox => {
      checkbox.checked = !allSelected;
      this.handleQuestionSelect({ target: checkbox });
    });
  }

  // ==================== ANSWER GENERATION ====================
  updateSelectedQuestions() {
    const container = document.getElementById('selectedQuestions');
    const styleSelector = document.getElementById('answerStyleSelector');

    if (this.selectedQuestions.size === 0) {
      container.innerHTML = '<p class="no-selection">Select questions from the Generate tab to create SOAR answers.</p>';
      styleSelector.style.display = 'none';
      return;
    }

    styleSelector.style.display = 'block';

    const selectedList = this.getSelectedQuestionTexts();
    container.innerHTML = `
      <h3>Selected Questions (${selectedList.length})</h3>
      <ul class="selected-question-list">
        ${selectedList.map((q, i) => `<li>${i + 1}. ${q}</li>`).join('')}
      </ul>
    `;
  }

  getSelectedQuestionTexts() {
    const questions = [];
    this.selectedQuestions.forEach(questionId => {
      const [category, index] = questionId.split('-');
      const questionData = this.currentQuestions[category]?.[parseInt(index)];
      if (questionData) {
        questions.push(questionData.text);
      }
    });
    return questions;
  }

  selectAnswerStyle(style) {
    document.querySelectorAll('.style-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-style="${style}"]`).classList.add('active');
  }

  async generateAnswers() {
    const selectedQuestionTexts = this.getSelectedQuestionTexts();
    console.log('Selected questions:', selectedQuestionTexts);

    if (selectedQuestionTexts.length === 0) {
      this.showError('Please select at least one question to generate answers for.');
      return;
    }

    const jobDescription = document.getElementById('jobDescription').value.trim();
    const role = document.getElementById('roleSelector').value;
    const experienceLevel = document.getElementById('experienceLevel').value;
    const companyName = document.getElementById('companyName').value.trim();
    const answerStyle = document.querySelector('.style-btn.active')?.dataset.style || 'confident';

    const requestData = {
      questions: selectedQuestionTexts,
      jobDescription,
      role,
      experienceLevel,
      companyName,
      answerStyle
    };

    console.log('Generate answers request data:', requestData);

    // Show loading
    this.setLoadingState(true, 'Generating SOAR answers...');

    try {
      console.log('Making request to /.netlify/functions/generate-answers');
      const response = await fetch('/.netlify/functions/generate-answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`Failed to generate answers: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      console.log('API Success Response:', result);
      this.currentAnswers = result.answers;

      this.displayAnswers();

      // Update stats
      this.stats.totalAnswers += result.answers.length;
      this.saveStats();

      // Track analytics
      if (typeof gtag !== 'undefined') {
        gtag('event', 'answers_generated', {
          answer_count: result.answers.length,
          answer_style: answerStyle
        });
      }

    } catch (error) {
      console.error('Answer generation error:', error);
      this.showError('An error occurred generating answers. Please try again.');
    } finally {
      this.setLoadingState(false);
    }
  }

  displayAnswers() {
    const container = document.getElementById('answersContainer');
    if (!container) return;

    container.innerHTML = '';

    this.currentAnswers.forEach((answer, i) => {
      const answerCard = document.createElement('div');
      answerCard.className = 'answer-card';
      answerCard.innerHTML = `
        <div class="answer-question">${answer.question}</div>
        <div class="answer-tabs">
          <button class="answer-tab active" data-answer-type="full" data-answer-index="${i}">Full Answer</button>
          <button class="answer-tab" data-answer-type="concise" data-answer-index="${i}">Concise</button>
          <button class="answer-tab" data-answer-type="keyPoints" data-answer-index="${i}">Key Points</button>
        </div>
        <div class="answer-content" id="answer-content-${i}">
          <div class="soar-section">
            <div class="soar-title">Full SOAR Answer (2-3 minutes)</div>
            <div class="soar-content">${this.formatAnswerText(answer.full)}</div>
          </div>
        </div>
      `;
      container.appendChild(answerCard);

      // Add tab listeners
      answerCard.querySelectorAll('.answer-tab').forEach(tab => {
        tab.addEventListener('click', (e) => this.switchAnswerTab(e));
      });
    });
  }

  switchAnswerTab(event) {
    const tab = event.target;
    const answerIndex = parseInt(tab.dataset.answerIndex);
    const answerType = tab.dataset.answerType;
    const answerCard = tab.closest('.answer-card');

    // Update tab states
    answerCard.querySelectorAll('.answer-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    // Update content
    const contentContainer = document.getElementById(`answer-content-${answerIndex}`);
    const answer = this.currentAnswers[answerIndex];

    let content = '';
    switch (answerType) {
      case 'full':
        content = `
          <div class="soar-section">
            <div class="soar-title">Full SOAR Answer (2-3 minutes)</div>
            <div class="soar-content">${this.formatAnswerText(answer.full)}</div>
          </div>
        `;
        break;
      case 'concise':
        content = `
          <div class="soar-section">
            <div class="soar-title">Concise Answer (30-60 seconds)</div>
            <div class="soar-content">${this.formatAnswerText(answer.concise)}</div>
          </div>
        `;
        break;
      case 'keyPoints':
        content = `
          <div class="soar-section">
            <div class="soar-title">Key Points</div>
            <ul class="key-points-list">
              ${answer.keyPoints.map(point => `<li>${point}</li>`).join('')}
            </ul>
          </div>
        `;
        break;
    }

    contentContainer.innerHTML = content;
  }

  formatAnswerText(text) {
    // Format SOAR sections if they exist
    return text
      .replace(/\*\*(Situation|Obstacles|Actions|Results):\*\*/g, '<div class="soar-title">$1:</div>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(.*)$/, '<p>$1</p>');
  }

  // ==================== PRACTICE MODE ====================
  startPractice() {
    const practiceType = document.querySelector('input[name="practiceType"]:checked').value;
    const timeLimit = parseInt(document.getElementById('timeLimit').value);

    let practiceQuestions = [];

    switch (practiceType) {
      case 'behavioral':
        practiceQuestions = this.currentQuestions.behavioral || [];
        break;
      case 'technical':
        practiceQuestions = [...(this.currentQuestions.technical || []), ...(this.currentQuestions.company || [])];
        break;
      case 'all':
        practiceQuestions = [
          ...(this.currentQuestions.behavioral || []),
          ...(this.currentQuestions.technical || []),
          ...(this.currentQuestions.company || [])
        ];
        break;
    }

    if (practiceQuestions.length === 0) {
      this.showError('No questions available for practice. Generate questions first.');
      return;
    }

    this.practiceSession = {
      questions: practiceQuestions,
      currentIndex: 0,
      timeLimit: timeLimit,
      startTime: Date.now(),
      questionTimes: [],
      isPaused: false,
      timer: null
    };

    this.showPracticeSession();
    this.startQuestionTimer();

    // Update stats
    this.stats.practiceSessions++;
    this.saveStats();

    // Track analytics
    if (typeof gtag !== 'undefined') {
      gtag('event', 'practice_started', {
        practice_type: practiceType,
        time_limit: timeLimit,
        question_count: practiceQuestions.length
      });
    }
  }

  showPracticeSession() {
    document.getElementById('practiceSetup').style.display = 'none';
    document.getElementById('practiceSession').style.display = 'block';
    document.getElementById('practiceComplete').style.display = 'none';

    this.updatePracticeDisplay();
  }

  updatePracticeDisplay() {
    const session = this.practiceSession;
    const currentQuestion = session.questions[session.currentIndex];

    document.getElementById('currentQuestionNum').textContent = session.currentIndex + 1;
    document.getElementById('totalQuestions').textContent = session.questions.length;
    document.querySelector('.current-question .question-text').textContent = currentQuestion.text;
    document.querySelector('.difficulty-tag').textContent = currentQuestion.confidence;

    // Update progress bar
    const progress = ((session.currentIndex + 1) / session.questions.length) * 100;
    document.getElementById('progressFill').style.width = `${progress}%`;
  }

  startQuestionTimer() {
    if (this.practiceSession.timeLimit === 0) return;

    let timeLeft = this.practiceSession.timeLimit;
    this.updateTimerDisplay(timeLeft);

    this.practiceSession.timer = setInterval(() => {
      if (this.practiceSession.isPaused) return;

      timeLeft--;
      this.updateTimerDisplay(timeLeft);

      if (timeLeft <= 0) {
        this.nextQuestion();
      }
    }, 1000);
  }

  updateTimerDisplay(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    document.getElementById('practiceTimer').textContent = `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  pausePractice() {
    this.practiceSession.isPaused = !this.practiceSession.isPaused;
    const pauseBtn = document.getElementById('pauseBtn');
    pauseBtn.textContent = this.practiceSession.isPaused ? '▶️ Resume' : '⏸️ Pause';
  }

  nextQuestion() {
    if (this.practiceSession.timer) {
      clearInterval(this.practiceSession.timer);
    }

    this.practiceSession.questionTimes.push(Date.now());
    this.practiceSession.currentIndex++;

    if (this.practiceSession.currentIndex >= this.practiceSession.questions.length) {
      this.completePractice();
    } else {
      this.updatePracticeDisplay();
      this.startQuestionTimer();
    }
  }

  endPractice() {
    if (this.practiceSession.timer) {
      clearInterval(this.practiceSession.timer);
    }
    this.completePractice();
  }

  completePractice() {
    const session = this.practiceSession;
    const endTime = Date.now();
    const totalDuration = Math.round((endTime - session.startTime) / 1000 / 60); // in minutes

    // Update completion stats
    document.getElementById('completedQuestions').textContent = session.currentIndex;
    document.getElementById('averageTime').textContent = session.timeLimit > 0 ?
      `${Math.floor(session.timeLimit / 60)}:${(session.timeLimit % 60).toString().padStart(2, '0')}` : 'No Limit';
    document.getElementById('sessionDuration').textContent = `${totalDuration}m`;

    // Show completion screen
    document.getElementById('practiceSession').style.display = 'none';
    document.getElementById('practiceComplete').style.display = 'block';

    // Update stats
    this.stats.practiceTime += totalDuration;
    this.saveStats();

    // Track analytics
    if (typeof gtag !== 'undefined') {
      gtag('event', 'practice_completed', {
        completed_questions: session.currentIndex,
        total_duration: totalDuration
      });
    }
  }

  startNewPracticeSession() {
    document.getElementById('practiceSetup').style.display = 'block';
    document.getElementById('practiceSession').style.display = 'none';
    document.getElementById('practiceComplete').style.display = 'none';
    this.practiceSession = null;
  }

  // ==================== SESSION MANAGEMENT ====================
  async saveSession() {
    const jobDescription = document.getElementById('jobDescription').value.trim();
    const role = document.getElementById('roleSelector').value;
    const experienceLevel = document.getElementById('experienceLevel').value;
    const companyName = document.getElementById('companyName').value.trim();

    if (!jobDescription || this.getTotalQuestionCount() === 0) {
      this.showError('Please generate questions before saving the session.');
      return;
    }

    const sessionTitle = `${role}${companyName ? ` at ${companyName}` : ''} - ${new Date().toLocaleDateString()}`;

    const sessionData = {
      title: sessionTitle,
      jobDescription,
      role,
      experienceLevel,
      companyName,
      questions: this.getAllQuestions(),
      answers: this.currentAnswers
    };

    try {
      // In a real implementation, this would call the save-session API
      // For now, we'll save to localStorage
      const sessionId = this.generateSessionId();
      const session = {
        id: sessionId,
        ...sessionData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      this.savedSessions.push(session);
      this.saveSessions();

      this.showSuccess('Session saved successfully!');

      // Track analytics
      if (typeof gtag !== 'undefined') {
        gtag('event', 'session_saved', {
          question_count: this.getTotalQuestionCount(),
          has_answers: this.currentAnswers.length > 0
        });
      }

    } catch (error) {
      console.error('Session save error:', error);
      this.showError('Failed to save session. Please try again.');
    }
  }

  async loadSavedSessions() {
    const container = document.getElementById('savedSessions');
    const emptyState = document.getElementById('emptySaved');

    if (!container) return;

    this.savedSessions = this.loadSessions();

    if (this.savedSessions.length === 0) {
      container.style.display = 'none';
      emptyState.style.display = 'block';
      return;
    }

    container.style.display = 'grid';
    emptyState.style.display = 'none';

    container.innerHTML = '';

    this.savedSessions.forEach(session => {
      const sessionCard = document.createElement('div');
      sessionCard.className = 'session-card';
      sessionCard.innerHTML = `
        <div class="session-header">
          <div>
            <div class="session-title">${session.title}</div>
            <div class="session-date">${new Date(session.createdAt).toLocaleDateString()}</div>
          </div>
          <span class="session-type">${session.role}</span>
        </div>
        <div class="session-meta">
          <div class="session-stat">
            <div class="session-stat-number">${session.questions?.length || 0}</div>
            <div class="session-stat-label">Questions</div>
          </div>
          <div class="session-stat">
            <div class="session-stat-number">${session.answers?.length || 0}</div>
            <div class="session-stat-label">Answers</div>
          </div>
          <div class="session-stat">
            <div class="session-stat-number">${session.experienceLevel?.split(' ')[0] || 'N/A'}</div>
            <div class="session-stat-label">Level</div>
          </div>
        </div>
        <div class="session-actions">
          <button class="session-btn" onclick="app.viewSession('${session.id}')">View</button>
          <button class="session-btn" onclick="app.practiceSession('${session.id}')">Practice</button>
          <button class="session-btn primary" onclick="app.exportSession('${session.id}')">Export</button>
          <button class="session-btn" onclick="app.deleteSession('${session.id}')" style="color: var(--accent-red);">Delete</button>
        </div>
      `;
      container.appendChild(sessionCard);
    });

    // Update saved count in stats
    this.stats.savedCount = this.savedSessions.length;
    this.saveStats();
  }

  viewSession(sessionId) {
    const session = this.savedSessions.find(s => s.id === sessionId);
    if (!session) return;

    // Load session data into generate tab
    document.getElementById('jobDescription').value = session.jobDescription;
    document.getElementById('roleSelector').value = session.role;
    document.getElementById('experienceLevel').value = session.experienceLevel || 'Mid Level';
    document.getElementById('companyName').value = session.companyName || '';

    // Set current questions and answers
    this.currentQuestions = {
      behavioral: session.questions.filter(q => q.category === 'behavioral') || [],
      technical: session.questions.filter(q => q.category === 'technical') || [],
      company: session.questions.filter(q => q.category === 'company') || []
    };
    this.currentAnswers = session.answers || [];

    // Switch to generate tab and display
    this.switchTab('generate');
    this.displayQuestions();
    this.showResults();
  }

  practiceSession(sessionId) {
    this.viewSession(sessionId);
    this.switchTab('practice');
  }

  async exportSession(sessionId) {
    const session = this.savedSessions.find(s => s.id === sessionId);
    if (!session) return;

    // Create export content
    const content = this.generateExportContent(session);

    // Create and download file
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${session.title.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    // Track analytics
    if (typeof gtag !== 'undefined') {
      gtag('event', 'session_exported', { session_id: sessionId });
    }
  }

  deleteSession(sessionId) {
    if (!confirm('Are you sure you want to delete this session?')) return;

    this.savedSessions = this.savedSessions.filter(s => s.id !== sessionId);
    this.saveSessions();
    this.loadSavedSessions();

    // Track analytics
    if (typeof gtag !== 'undefined') {
      gtag('event', 'session_deleted', { session_id: sessionId });
    }
  }

  generateExportContent(session) {
    let content = `INTERVIEW ORACLE PRO - SAVED SESSION\n`;
    content += `=====================================\n\n`;
    content += `Title: ${session.title}\n`;
    content += `Role: ${session.role}\n`;
    content += `Experience Level: ${session.experienceLevel}\n`;
    content += `Company: ${session.companyName || 'N/A'}\n`;
    content += `Created: ${new Date(session.createdAt).toLocaleDateString()}\n\n`;

    content += `JOB DESCRIPTION:\n`;
    content += `${session.jobDescription}\n\n`;

    content += `INTERVIEW QUESTIONS:\n`;
    content += `===================\n\n`;

    if (session.questions && session.questions.length > 0) {
      session.questions.forEach((q, i) => {
        content += `${i + 1}. ${q.text || q}\n`;
        if (q.confidence) content += `   Confidence: ${q.confidence}\n`;
        content += `\n`;
      });
    }

    if (session.answers && session.answers.length > 0) {
      content += `SOAR ANSWERS:\n`;
      content += `============\n\n`;

      session.answers.forEach((answer, i) => {
        content += `${i + 1}. ${answer.question}\n`;
        content += `${'-'.repeat(answer.question.length + 3)}\n\n`;
        content += `FULL ANSWER:\n${answer.full}\n\n`;
        content += `CONCISE ANSWER:\n${answer.concise}\n\n`;
        content += `KEY POINTS:\n`;
        answer.keyPoints.forEach(point => content += `• ${point}\n`);
        content += `\n`;
      });
    }

    return content;
  }

  // ==================== STATS & ANALYTICS ====================
  updateStatsDisplay() {
    const stats = this.stats;

    document.getElementById('totalQuestions').textContent = stats.totalQuestions;
    document.getElementById('totalAnswers').textContent = stats.totalAnswers;
    document.getElementById('practiceSessions').textContent = stats.practiceSessions;
    document.getElementById('practiceTime').textContent = `${stats.practiceTime}h`;
    document.getElementById('savedCount').textContent = stats.savedCount;
    document.getElementById('streakDays').textContent = stats.streakDays;

    this.updateActivityTimeline();
  }

  updateActivityTimeline() {
    const timeline = document.getElementById('activityTimeline');
    if (!timeline) return;

    // Mock activity data - in a real app, this would come from a database
    const activities = [
      {
        icon: '⚡',
        title: 'Generated questions for Software Engineer role',
        time: '2 hours ago'
      },
      {
        icon: '💡',
        title: 'Created SOAR answers for 5 questions',
        time: '1 day ago'
      },
      {
        icon: '🎯',
        title: 'Completed practice session (8 questions)',
        time: '2 days ago'
      },
      {
        icon: '💾',
        title: 'Saved session: Product Manager at Google',
        time: '3 days ago'
      }
    ];

    timeline.innerHTML = activities.map(activity => `
      <div class="activity-item">
        <div class="activity-icon">${activity.icon}</div>
        <div class="activity-content">
          <div class="activity-title">${activity.title}</div>
          <div class="activity-time">${activity.time}</div>
        </div>
      </div>
    `).join('');
  }

  // ==================== UTILITY METHODS ====================
  setLoadingState(isLoading, message = 'Analyzing job description and generating personalized questions...') {
    const loading = document.getElementById('loading');
    const loadingText = document.querySelector('.loading-text');
    const predictButton = document.getElementById('predictButton');

    if (loading) {
      if (isLoading) {
        loading.classList.add('active');
        if (loadingText) loadingText.textContent = message;
      } else {
        loading.classList.remove('active');
      }
    }

    if (predictButton) {
      predictButton.disabled = isLoading;
    }
  }

  showResults() {
    const resultsSection = document.getElementById('resultsSection');
    if (resultsSection) {
      resultsSection.classList.add('active');
    }
  }

  showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.classList.add('active');
      setTimeout(() => errorDiv.classList.remove('active'), 5000);
    } else {
      alert(message);
    }
  }

  showSuccess(message) {
    // Create temporary success notification
    const notification = document.createElement('div');
    notification.className = 'success-notification';
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 2rem;
      right: 2rem;
      background: var(--accent-green);
      color: white;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      font-weight: 600;
      z-index: 1000;
      animation: fadeInUp 0.3s ease-out;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'fadeOutUp 0.3s ease-out';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  getTotalQuestionCount() {
    return (this.currentQuestions.behavioral?.length || 0) +
           (this.currentQuestions.technical?.length || 0) +
           (this.currentQuestions.company?.length || 0);
  }

  getAllQuestions() {
    const questions = [];

    ['behavioral', 'technical', 'company'].forEach(category => {
      if (this.currentQuestions[category]) {
        this.currentQuestions[category].forEach(q => {
          questions.push({
            ...q,
            category
          });
        });
      }
    });

    return questions;
  }

  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  checkMemberStatus() {
    // In a real implementation, this would check authentication
    const memberName = 'PRO Member';
    document.getElementById('memberName').textContent = memberName;
  }

  // ==================== LOCAL STORAGE ====================
  loadStats() {
    const defaultStats = {
      totalQuestions: 0,
      totalAnswers: 0,
      practiceSessions: 0,
      practiceTime: 0,
      savedCount: 0,
      streakDays: 0,
      lastActiveDate: null
    };

    try {
      const stored = localStorage.getItem('interview_oracle_pro_stats');
      return stored ? { ...defaultStats, ...JSON.parse(stored) } : defaultStats;
    } catch (error) {
      console.error('Error loading stats:', error);
      return defaultStats;
    }
  }

  saveStats() {
    try {
      localStorage.setItem('interview_oracle_pro_stats', JSON.stringify(this.stats));
    } catch (error) {
      console.error('Error saving stats:', error);
    }
  }

  loadSessions() {
    try {
      const stored = localStorage.getItem('interview_oracle_pro_sessions');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading sessions:', error);
      return [];
    }
  }

  saveSessions() {
    try {
      localStorage.setItem('interview_oracle_pro_sessions', JSON.stringify(this.savedSessions));
    } catch (error) {
      console.error('Error saving sessions:', error);
    }
  }
}

// Initialize the application
let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new InterviewOraclePro();
});