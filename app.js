/**
 * Interview Oracle PRO - Professional Interview Preparation Suite
 * Modern ES6+ JavaScript Application with Class-based Architecture
 */

class InterviewOraclePro {
  constructor() {
    // Core application state
    this.currentQuestions = {
      behavioral: [],
      technical: [],
      company: []
    };
    this.currentAnswers = [];
    this.savedSessions = [];
    this.selectedQuestions = new Set();
    this.activeTab = 'generate';
    this.stats = this.getDefaultStats();

    // Practice session state
    this.practiceSession = null;
    this.practiceTimer = null;

    // Initialize application
    this.init();
  }

  // ===== INITIALIZATION =====

  init() {
    this.setupEventListeners();
    this.loadSavedData();
    this.setupCharacterCounter();
    this.showTab('generate');
    console.log('Interview Oracle PRO initialized successfully');
  }

  setupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.tab-button').forEach(button => {
      button.addEventListener('click', (e) => {
        const tabName = e.currentTarget.dataset.tab;
        this.showTab(tabName);
      });
    });

    // Question form submission
    const questionForm = document.getElementById('questionForm');
    if (questionForm) {
      questionForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.generateQuestions();
      });
    }

    // Question selection
    document.addEventListener('change', (e) => {
      if (e.target.classList.contains('question-checkbox')) {
        this.handleQuestionSelection(e);
      }
    });

    // Answer generation
    const generateAnswersBtn = document.getElementById('generateAnswersBtn');
    if (generateAnswersBtn) {
      generateAnswersBtn.addEventListener('click', () => {
        this.generateAnswers();
      });
    }

    // Select all questions
    const selectAllBtn = document.getElementById('selectAllQuestions');
    if (selectAllBtn) {
      selectAllBtn.addEventListener('click', () => {
        this.selectAllQuestions();
      });
    }

    // Save session
    const saveSessionBtn = document.getElementById('saveSessionBtn');
    if (saveSessionBtn) {
      saveSessionBtn.addEventListener('click', () => {
        this.saveCurrentSession();
      });
    }

    // Answer style selection
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('style-button')) {
        this.selectAnswerStyle(e.target.dataset.style);
      }
    });

    // Answer tab switching
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('answer-tab')) {
        this.showAnswerVariation(e.target.dataset.answerIndex, e.target.dataset.answerType);
      }
    });

    // Practice mode
    const startPracticeBtn = document.getElementById('startPracticeBtn');
    if (startPracticeBtn) {
      startPracticeBtn.addEventListener('click', () => {
        this.startPracticeMode();
      });
    }

    // Category selection
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('select-category-button')) {
        this.selectCategoryQuestions(e.target.dataset.category);
      }
    });
  }

  setupCharacterCounter() {
    const jobDescTextarea = document.getElementById('jobDescription');
    const charCount = document.getElementById('charCount');

    if (jobDescTextarea && charCount) {
      jobDescTextarea.addEventListener('input', () => {
        const count = jobDescTextarea.value.length;
        charCount.textContent = count;
        charCount.style.color = count > 2800 ? '#e74c3c' : count > 2400 ? '#f39c12' : '#8B9DC3';
      });
    }
  }

  loadSavedData() {
    try {
      const savedSessions = localStorage.getItem('interview_oracle_pro_sessions');
      this.savedSessions = savedSessions ? JSON.parse(savedSessions) : [];

      const savedStats = localStorage.getItem('interview_oracle_pro_stats');
      this.stats = savedStats ? { ...this.getDefaultStats(), ...JSON.parse(savedStats) } : this.getDefaultStats();

      console.log('Loaded saved data:', { sessions: this.savedSessions.length, stats: this.stats });
    } catch (error) {
      console.error('Error loading saved data:', error);
      this.showError('Failed to load saved data');
    }
  }

  // ===== TAB MANAGEMENT =====

  showTab(tabName) {
    // Update active tab
    this.activeTab = tabName;

    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });

    // Remove active class from all tab buttons
    document.querySelectorAll('.tab-button').forEach(button => {
      button.classList.remove('active');
    });

    // Show selected tab content
    const targetTab = document.getElementById(`${tabName}-tab`);
    if (targetTab) {
      targetTab.classList.add('active');
    }

    // Add active class to selected tab button
    const targetButton = document.querySelector(`[data-tab="${tabName}"]`);
    if (targetButton) {
      targetButton.classList.add('active');
    }

    // Load tab-specific content
    this.loadTabContent(tabName);

    // Track analytics
    this.trackEvent('tab_viewed', { tab: tabName });
  }

  loadTabContent(tabName) {
    switch (tabName) {
      case 'saved':
        this.displaySavedSessions();
        break;
      case 'stats':
        this.displayStats();
        break;
      case 'answers':
        this.updateSelectedQuestionsPreview();
        break;
      case 'practice':
        this.loadPracticeOptions();
        break;
    }
  }

  // ===== QUESTION GENERATION =====

  async generateQuestions() {
    if (!this.validateQuestionInput()) {
      return;
    }

    const formData = this.getQuestionFormData();

    this.showLoading(true, 'Analyzing job description and generating personalized questions...');

    try {
      console.log('Generating questions with data:', formData);

      const response = await fetch('/.netlify/functions/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Questions generated successfully:', result);

      this.currentQuestions = result;
      this.selectedQuestions.clear();
      this.displayQuestions();
      this.showQuestionsResults();

      // Update stats
      const totalQuestions = this.getTotalQuestionCount();
      this.stats.totalQuestions += totalQuestions;
      this.stats.lastActivity = new Date().toISOString();
      this.saveStats();

      this.trackEvent('questions_generated', {
        role: formData.role,
        experience_level: formData.experienceLevel,
        question_count: totalQuestions
      });

    } catch (error) {
      console.error('Question generation error:', error);
      this.showError(`Failed to generate questions: ${error.message}`);
    } finally {
      this.showLoading(false);
    }
  }

  validateQuestionInput() {
    const jobDescription = document.getElementById('jobDescription').value.trim();
    const role = document.getElementById('roleSelector').value;
    const experienceLevel = document.getElementById('experienceLevel').value;

    if (!jobDescription) {
      this.showError('Please provide a job description');
      document.getElementById('jobDescription').focus();
      return false;
    }

    if (jobDescription.length < 50) {
      this.showError('Please provide a more detailed job description (at least 50 characters)');
      document.getElementById('jobDescription').focus();
      return false;
    }

    if (!role) {
      this.showError('Please select a role category');
      document.getElementById('roleSelector').focus();
      return false;
    }

    if (!experienceLevel) {
      this.showError('Please select your experience level');
      document.getElementById('experienceLevel').focus();
      return false;
    }

    return true;
  }

  getQuestionFormData() {
    return {
      jobDescription: document.getElementById('jobDescription').value.trim(),
      role: document.getElementById('roleSelector').value,
      experienceLevel: document.getElementById('experienceLevel').value,
      companyName: document.getElementById('companyName').value.trim()
    };
  }

  displayQuestions() {
    const container = document.getElementById('questionCategories');
    if (!container) return;

    container.innerHTML = '';

    const categories = [
      {
        key: 'behavioral',
        title: 'Behavioral Questions',
        icon: '💭',
        description: 'Assess soft skills, experience, and cultural fit'
      },
      {
        key: 'technical',
        title: 'Technical/Role-Specific Questions',
        icon: '🔧',
        description: 'Evaluate hard skills and domain knowledge'
      },
      {
        key: 'company',
        title: 'Company-Specific Questions',
        icon: '🏢',
        description: 'Focus on organization and role context'
      }
    ];

    categories.forEach(category => {
      const questions = this.currentQuestions[category.key] || [];
      if (questions.length === 0) return;

      const categoryDiv = document.createElement('div');
      categoryDiv.className = 'question-category';
      categoryDiv.innerHTML = `
        <div class="category-header">
          <h3 class="category-title">
            <span class="category-icon">${category.icon}</span>
            ${category.title}
          </h3>
          <button class="select-category-button" data-category="${category.key}">
            Select All
          </button>
        </div>
        <div class="question-list" id="${category.key}Questions"></div>
      `;

      container.appendChild(categoryDiv);
      this.displayCategoryQuestions(category.key, questions);
    });
  }

  displayCategoryQuestions(category, questions) {
    const container = document.getElementById(`${category}Questions`);
    if (!container) return;

    container.innerHTML = '';

    questions.forEach((question, index) => {
      const questionCard = document.createElement('div');
      questionCard.className = 'question-card';
      questionCard.innerHTML = `
        <div class="question-content">
          <input
            type="checkbox"
            class="question-checkbox"
            id="q_${category}_${index}"
            data-category="${category}"
            data-index="${index}"
          >
          <div class="question-details">
            <div class="question-number">Question ${index + 1}</div>
            <div class="question-text">${this.sanitizeInput(question.text)}</div>
            <div class="question-meta">
              <span class="confidence-tag">${question.confidence}</span>
              <span class="difficulty-tag">PRO</span>
            </div>
          </div>
        </div>
      `;

      container.appendChild(questionCard);
    });
  }

  showQuestionsResults() {
    const resultsSection = document.getElementById('questionsResults');
    if (resultsSection) {
      resultsSection.classList.remove('hidden');
      resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // ===== QUESTION SELECTION =====

  handleQuestionSelection(event) {
    const checkbox = event.target;
    const category = checkbox.dataset.category;
    const index = checkbox.dataset.index;
    const questionId = `${category}_${index}`;
    const questionCard = checkbox.closest('.question-card');

    if (checkbox.checked) {
      this.selectedQuestions.add(questionId);
      questionCard.classList.add('selected');
    } else {
      this.selectedQuestions.delete(questionId);
      questionCard.classList.remove('selected');
    }

    this.updateSelectedQuestionsPreview();
    console.log('Selected questions:', Array.from(this.selectedQuestions));
  }

  selectAllQuestions() {
    const checkboxes = document.querySelectorAll('.question-checkbox');
    const allSelected = Array.from(checkboxes).every(cb => cb.checked);

    checkboxes.forEach(checkbox => {
      checkbox.checked = !allSelected;
      checkbox.dispatchEvent(new Event('change'));
    });
  }

  selectCategoryQuestions(category) {
    const checkboxes = document.querySelectorAll(`[data-category="${category}"]`);
    const allSelected = Array.from(checkboxes).every(cb => cb.checked);

    checkboxes.forEach(checkbox => {
      checkbox.checked = !allSelected;
      checkbox.dispatchEvent(new Event('change'));
    });
  }

  getSelectedQuestions() {
    const selected = [];
    this.selectedQuestions.forEach(questionId => {
      const [category, index] = questionId.split('_');
      const question = this.currentQuestions[category]?.[parseInt(index)];
      if (question) {
        selected.push({
          id: questionId,
          category,
          index: parseInt(index),
          text: question.text,
          confidence: question.confidence
        });
      }
    });
    return selected;
  }

  updateSelectedQuestionsPreview() {
    const container = document.getElementById('selectedQuestionsPreview');
    const styleSelector = document.getElementById('answerStyleSelector');

    if (!container) return;

    const selectedQuestions = this.getSelectedQuestions();

    if (selectedQuestions.length === 0) {
      container.innerHTML = '<p class="no-selection">Select questions from the Generate tab to create SOAR answers.</p>';
      styleSelector?.classList.add('hidden');
      return;
    }

    container.innerHTML = `
      <h3>Selected Questions (${selectedQuestions.length})</h3>
      <ul class="selected-questions-list">
        ${selectedQuestions.map((q, i) => `
          <li class="selected-question-item">
            <span class="question-number">${i + 1}.</span>
            <span class="question-text">${this.sanitizeInput(q.text)}</span>
          </li>
        `).join('')}
      </ul>
    `;

    styleSelector?.classList.remove('hidden');
  }

  // ===== ANSWER GENERATION =====

  async generateAnswers() {
    const selectedQuestions = this.getSelectedQuestions();

    if (selectedQuestions.length === 0) {
      this.showError('Please select at least one question to generate answers for.');
      return;
    }

    const formData = this.getQuestionFormData();
    const answerStyle = this.getSelectedAnswerStyle();

    this.showLoading(true, 'Generating SOAR framework answers...');

    try {
      console.log('Generating answers for questions:', selectedQuestions);

      const response = await fetch('/.netlify/functions/generate-answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questions: selectedQuestions.map(q => q.text),
          jobDescription: formData.jobDescription,
          role: formData.role,
          experienceLevel: formData.experienceLevel,
          companyName: formData.companyName,
          answerStyle: answerStyle
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Answers generated successfully:', result);

      this.currentAnswers = result.answers;
      this.displayAnswers();
      this.showTab('answers');

      // Update stats
      this.stats.totalAnswers += result.answers.length;
      this.stats.lastActivity = new Date().toISOString();
      this.saveStats();

      this.trackEvent('answers_generated', {
        answer_count: result.answers.length,
        answer_style: answerStyle
      });

    } catch (error) {
      console.error('Answer generation error:', error);
      this.showError(`Failed to generate answers: ${error.message}`);
    } finally {
      this.showLoading(false);
    }
  }

  getSelectedAnswerStyle() {
    const activeStyleButton = document.querySelector('.style-button.active');
    return activeStyleButton?.dataset.style || 'confident';
  }

  selectAnswerStyle(style) {
    document.querySelectorAll('.style-button').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-style="${style}"]`)?.classList.add('active');
  }

  displayAnswers() {
    const container = document.getElementById('answersContainer');
    if (!container) return;

    container.innerHTML = '';

    this.currentAnswers.forEach((answer, index) => {
      const answerSection = document.createElement('div');
      answerSection.className = 'answer-section';
      answerSection.innerHTML = `
        <div class="answer-question">${this.sanitizeInput(answer.question)}</div>
        <div class="answer-tabs">
          <button class="answer-tab active" data-answer-index="${index}" data-answer-type="full">
            Full Answer
          </button>
          <button class="answer-tab" data-answer-index="${index}" data-answer-type="concise">
            Concise
          </button>
          <button class="answer-tab" data-answer-index="${index}" data-answer-type="keyPoints">
            Key Points
          </button>
        </div>
        <div class="answer-content" id="answer-content-${index}">
          ${this.formatSOARAnswer(answer.full, 'full')}
        </div>
      `;

      container.appendChild(answerSection);
    });
  }

  showAnswerVariation(answerIndex, answerType) {
    const index = parseInt(answerIndex);
    const answer = this.currentAnswers[index];

    if (!answer) return;

    // Update tab states
    const answerSection = document.querySelector(`[data-answer-index="${index}"]`).closest('.answer-section');
    answerSection.querySelectorAll('.answer-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    answerSection.querySelector(`[data-answer-type="${answerType}"]`).classList.add('active');

    // Update content
    const contentContainer = document.getElementById(`answer-content-${index}`);
    contentContainer.innerHTML = this.formatSOARAnswer(answer[answerType], answerType);
  }

  formatSOARAnswer(content, type) {
    if (type === 'keyPoints') {
      const points = Array.isArray(content) ? content : [content];
      return `
        <div class="key-points-section">
          <div class="soar-title">Key Talking Points</div>
          <ul class="key-points-list">
            ${points.map(point => `<li>${this.sanitizeInput(point)}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    // For full and concise answers, try to structure as SOAR if possible
    const cleanContent = this.sanitizeInput(content);

    if (type === 'full') {
      return `
        <div class="soar-framework">
          <div class="soar-title">Full SOAR Answer (2-3 minutes)</div>
          <div class="soar-content">${cleanContent}</div>
        </div>
      `;
    }

    return `
      <div class="soar-framework">
        <div class="soar-title">Concise Answer (60-90 seconds)</div>
        <div class="soar-content">${cleanContent}</div>
      </div>
    `;
  }

  // ===== SESSION MANAGEMENT =====

  saveCurrentSession() {
    if (this.getTotalQuestionCount() === 0) {
      this.showError('No questions to save. Generate questions first.');
      return;
    }

    const formData = this.getQuestionFormData();
    const sessionData = {
      id: this.generateSessionId(),
      ...formData,
      questions: this.getAllQuestions(),
      answers: this.currentAnswers,
      selectedQuestions: Array.from(this.selectedQuestions),
      createdAt: new Date().toISOString()
    };

    try {
      this.savedSessions.push(sessionData);
      this.saveSessions();

      // Update stats
      this.stats.savedCount = this.savedSessions.length;
      this.saveStats();

      this.showSuccessMessage('Session saved successfully!');

      this.trackEvent('session_saved', {
        question_count: this.getTotalQuestionCount(),
        has_answers: this.currentAnswers.length > 0
      });

    } catch (error) {
      console.error('Session save error:', error);
      this.showError('Failed to save session. Please try again.');
    }
  }

  generateSessionId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  getAllQuestions() {
    const allQuestions = [];
    Object.entries(this.currentQuestions).forEach(([category, questions]) => {
      questions.forEach((question, index) => {
        allQuestions.push({
          ...question,
          category,
          index
        });
      });
    });
    return allQuestions;
  }

  displaySavedSessions() {
    const container = document.getElementById('savedSessions');
    const emptyState = document.getElementById('emptySavedSessions');

    if (!container) return;

    if (this.savedSessions.length === 0) {
      container.innerHTML = '';
      emptyState?.classList.remove('hidden');
      return;
    }

    emptyState?.classList.add('hidden');

    container.innerHTML = this.savedSessions.map(session => `
      <div class="session-card" onclick="app.loadSession('${session.id}')">
        <div class="session-header">
          <h3 class="session-title">${session.role} - ${session.experienceLevel}</h3>
          <div class="session-date">${this.formatDate(session.createdAt)}</div>
        </div>
        <div class="session-stats">
          <span class="session-stat">
            <strong>${session.questions?.length || 0}</strong> Questions
          </span>
          <span class="session-stat">
            <strong>${session.answers?.length || 0}</strong> Answers
          </span>
        </div>
        <div class="session-actions" onclick="event.stopPropagation()">
          <button class="action-button" onclick="app.loadSession('${session.id}')">
            Load Session
          </button>
          <button class="action-button" onclick="app.deleteSession('${session.id}')">
            Delete
          </button>
        </div>
      </div>
    `).join('');
  }

  loadSession(sessionId) {
    const session = this.savedSessions.find(s => s.id === sessionId);
    if (!session) {
      this.showError('Session not found');
      return;
    }

    // Restore form data
    document.getElementById('jobDescription').value = session.jobDescription || '';
    document.getElementById('roleSelector').value = session.role || '';
    document.getElementById('experienceLevel').value = session.experienceLevel || '';
    document.getElementById('companyName').value = session.companyName || '';

    // Restore questions and answers
    this.currentQuestions = {
      behavioral: session.questions?.filter(q => q.category === 'behavioral') || [],
      technical: session.questions?.filter(q => q.category === 'technical') || [],
      company: session.questions?.filter(q => q.category === 'company') || []
    };

    this.currentAnswers = session.answers || [];
    this.selectedQuestions = new Set(session.selectedQuestions || []);

    // Switch to generate tab and display
    this.showTab('generate');
    this.displayQuestions();
    this.showQuestionsResults();

    this.showSuccessMessage('Session loaded successfully!');

    this.trackEvent('session_loaded', { session_id: sessionId });
  }

  deleteSession(sessionId) {
    if (!confirm('Are you sure you want to delete this session?')) {
      return;
    }

    this.savedSessions = this.savedSessions.filter(s => s.id !== sessionId);
    this.saveSessions();

    // Update stats
    this.stats.savedCount = this.savedSessions.length;
    this.saveStats();

    this.displaySavedSessions();
    this.showSuccessMessage('Session deleted successfully!');

    this.trackEvent('session_deleted', { session_id: sessionId });
  }

  // ===== PRACTICE MODE =====

  startPracticeMode() {
    if (this.getTotalQuestionCount() === 0) {
      this.showError('No questions available for practice. Generate questions first.');
      return;
    }

    const practiceType = document.querySelector('input[name="practiceType"]:checked')?.value || 'all';
    const timeLimit = parseInt(document.getElementById('timeLimit').value) || 120;

    this.practiceSession = {
      questions: this.getPracticeQuestions(practiceType),
      currentIndex: 0,
      timeLimit: timeLimit,
      startTime: Date.now(),
      completedQuestions: 0
    };

    this.displayPracticeSession();

    this.trackEvent('practice_started', {
      question_count: this.practiceSession.questions.length,
      time_limit: timeLimit,
      practice_type: practiceType
    });
  }

  getPracticeQuestions(practiceType) {
    let questions = [];

    if (practiceType === 'all') {
      questions = this.getAllQuestions();
    } else {
      questions = (this.currentQuestions[practiceType] || []).map((q, index) => ({
        ...q,
        category: practiceType,
        index
      }));
    }

    // Shuffle questions
    return questions.sort(() => Math.random() - 0.5);
  }

  displayPracticeSession() {
    const container = document.getElementById('practiceSession');
    const setupContainer = document.getElementById('practiceSetup');

    if (!container) return;

    setupContainer.classList.add('hidden');
    container.classList.remove('hidden');

    // Practice session UI will be implemented here
    container.innerHTML = `
      <div class="practice-interface">
        <div class="practice-header">
          <h3>Practice Session Active</h3>
          <p>Question ${this.practiceSession.currentIndex + 1} of ${this.practiceSession.questions.length}</p>
        </div>
        <div class="practice-content">
          <p>Practice mode implementation coming soon...</p>
        </div>
      </div>
    `;
  }

  // ===== STATS TRACKING =====

  displayStats() {
    const statsGrid = document.getElementById('statsGrid');
    if (!statsGrid) return;

    const stats = [
      { label: 'Questions Generated', value: this.stats.totalQuestions, icon: '⚡' },
      { label: 'SOAR Answers Created', value: this.stats.totalAnswers, icon: '💡' },
      { label: 'Practice Sessions', value: this.stats.practiceSessions, icon: '🎯' },
      { label: 'Saved Sessions', value: this.stats.savedCount, icon: '💾' },
      { label: 'Days Active', value: this.calculateDaysActive(), icon: '📅' },
      { label: 'Success Rate', value: this.calculateSuccessRate() + '%', icon: '📈' }
    ];

    statsGrid.innerHTML = stats.map(stat => `
      <div class="stat-card">
        <div class="stat-icon">${stat.icon}</div>
        <div class="stat-number">${stat.value}</div>
        <div class="stat-label">${stat.label}</div>
      </div>
    `).join('');
  }

  calculateDaysActive() {
    if (!this.stats.firstActivity) return 0;
    const first = new Date(this.stats.firstActivity);
    const now = new Date();
    return Math.ceil((now - first) / (1000 * 60 * 60 * 24));
  }

  calculateSuccessRate() {
    if (this.stats.totalQuestions === 0) return 0;
    return Math.round((this.stats.totalAnswers / this.stats.totalQuestions) * 100);
  }

  getDefaultStats() {
    return {
      totalQuestions: 0,
      totalAnswers: 0,
      practiceSessions: 0,
      savedCount: 0,
      firstActivity: null,
      lastActivity: null
    };
  }

  saveStats() {
    try {
      if (!this.stats.firstActivity) {
        this.stats.firstActivity = new Date().toISOString();
      }
      localStorage.setItem('interview_oracle_pro_stats', JSON.stringify(this.stats));
    } catch (error) {
      console.error('Error saving stats:', error);
    }
  }

  saveSessions() {
    try {
      localStorage.setItem('interview_oracle_pro_sessions', JSON.stringify(this.savedSessions));
    } catch (error) {
      console.error('Error saving sessions:', error);
    }
  }

  // ===== UTILITY FUNCTIONS =====

  showError(message) {
    const errorElement = document.getElementById('globalError');
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.classList.remove('hidden');

      // Auto-hide after 5 seconds
      setTimeout(() => {
        errorElement.classList.add('hidden');
      }, 5000);
    }
    console.error('Error:', message);
  }

  showSuccessMessage(message) {
    // Create or update success message element
    let successElement = document.getElementById('globalSuccess');
    if (!successElement) {
      successElement = document.createElement('div');
      successElement.id = 'globalSuccess';
      successElement.className = 'success-message';
      successElement.style.cssText = `
        background: linear-gradient(135deg, #27ae60, #2ecc71);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        margin-bottom: 1rem;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 0.75rem;
      `;
      successElement.innerHTML = '<span>✅</span><span class="message-text"></span>';
      document.querySelector('.main-content').prepend(successElement);
    }

    successElement.querySelector('.message-text').textContent = message;
    successElement.classList.remove('hidden');

    // Auto-hide after 3 seconds
    setTimeout(() => {
      successElement.classList.add('hidden');
    }, 3000);
  }

  showLoading(state, message = 'Processing...') {
    const loadingElement = document.getElementById('globalLoading');
    const loadingText = document.getElementById('loadingText');

    if (loadingElement) {
      if (state) {
        loadingElement.classList.remove('hidden');
        if (loadingText) {
          loadingText.textContent = message;
        }
      } else {
        loadingElement.classList.add('hidden');
      }
    }
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  sanitizeInput(text) {
    if (typeof text !== 'string') return text;
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  getTotalQuestionCount() {
    return Object.values(this.currentQuestions).reduce((total, questions) => total + questions.length, 0);
  }

  trackEvent(eventName, properties = {}) {
    // Google Analytics tracking
    if (typeof gtag !== 'undefined') {
      gtag('event', eventName, properties);
    }

    console.log('Event tracked:', eventName, properties);
  }

  loadPracticeOptions() {
    // Initialize practice options if needed
    console.log('Practice options loaded');
  }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.app = new InterviewOraclePro();
});