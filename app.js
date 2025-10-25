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


    // Answer tab switching
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('answer-tab')) {
        this.showAnswerVariation(e.target.dataset.answerIndex, e.target.dataset.answerType);
      }
    });


    // Category selection
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('select-category-button')) {
        this.selectCategoryQuestions(e.target.dataset.category);
      }
    });

    // Copy answer functionality
    document.addEventListener('click', (e) => {
      if (e.target.closest('.copy-answer-btn')) {
        const answerIndex = e.target.closest('.copy-answer-btn').dataset.answerIndex;
        this.copyAnswerToClipboard(answerIndex);
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
        this.displayActivityTimeline();
        break;
      case 'answers':
        this.updateSelectedQuestionsPreview();
        break;
    }
  }

  // ===== QUESTION GENERATION =====

  async generateQuestions() {
    if (!this.validateQuestionInput()) {
      return;
    }

    const formData = this.getQuestionFormData();

    this.showLoading(true, 'questions');

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

      // Add activity tracking
      this.addActivity('questions_generated', `Generated ${totalQuestions} questions for ${formData.role} role`);

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

    // Update Select All button text after questions are displayed
    this.updateSelectAllButtonText();
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
            <div class="question-number">${index + 1}.</div>
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
    this.updateSelectAllButtonText();
    console.log('Selected questions:', Array.from(this.selectedQuestions));
  }

  updateSelectAllButtonText() {
    const checkboxes = document.querySelectorAll('.question-checkbox');
    const allSelected = Array.from(checkboxes).every(cb => cb.checked);
    const selectAllBtn = document.getElementById('selectAllQuestions');

    if (selectAllBtn && checkboxes.length > 0) {
      selectAllBtn.textContent = allSelected ? 'Deselect All' : 'Select All';
    }
  }

  selectAllQuestions() {
    const checkboxes = document.querySelectorAll('.question-checkbox');
    const allSelected = Array.from(checkboxes).every(cb => cb.checked);
    const selectAllBtn = document.getElementById('selectAllQuestions');

    checkboxes.forEach(checkbox => {
      checkbox.checked = !allSelected;
      // Fire the change event with bubbles: true to trigger selection logic
      checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Update button text to reflect new state
    if (selectAllBtn) {
      selectAllBtn.textContent = allSelected ? 'Select All' : 'Deselect All';
    }
  }

  selectCategoryQuestions(category) {
    const checkboxes = document.querySelectorAll(`[data-category="${category}"]`);
    const allSelected = Array.from(checkboxes).every(cb => cb.checked);

    checkboxes.forEach(checkbox => {
      checkbox.checked = !allSelected;
      // Fire the change event with bubbles: true to trigger selection logic
      checkbox.dispatchEvent(new Event('change', { bubbles: true }));
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

    if (!container) return;

    const selectedQuestions = this.getSelectedQuestions();

    if (selectedQuestions.length === 0) {
      container.innerHTML = '<p class="no-selection">Select questions from the Generate tab to create tailored answers.</p>';
      return;
    }

    container.innerHTML = `
      <h3>Selected Questions (${selectedQuestions.length})</h3>
      <div class="selected-questions-list">
        ${selectedQuestions.map((q, i) => `
          <div class="selected-question-item">
            <span class="question-number">${i + 1}.</span>
            <span class="question-text">${this.sanitizeInput(q.text)}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  // ===== ANSWER GENERATION =====

  async generateAnswers() {
    const selectedQuestions = this.getSelectedQuestions();

    if (selectedQuestions.length === 0) {
      this.showError('Please select at least one question to generate answers for.');
      return;
    }

    const formData = this.getQuestionFormData();

    this.showLoading(true, 'answers');

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
          answerStyle: 'confident'
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

      // Add activity tracking
      this.addActivity('answers_generated', `Created tailored answers for ${result.answers.length} questions`);

      this.trackEvent('answers_generated', {
        answer_count: result.answers.length
      });

    } catch (error) {
      console.error('Answer generation error:', error);
      this.showError(`Failed to generate answers: ${error.message}`);
    } finally {
      this.showLoading(false);
    }
  }


  displayAnswers() {
    const container = document.getElementById('answersContainer');
    if (!container) return;

    container.innerHTML = '';

    this.currentAnswers.forEach((answer, index) => {
      const answerSection = document.createElement('div');
      answerSection.className = 'answer-section';

      const methodologyBadge = this.createMethodologyBadge(answer.methodology, answer.type);

      answerSection.innerHTML = `
        <div class="answer-header">
          <div class="answer-question">${this.sanitizeInput(answer.question)}</div>
          <button class="copy-answer-btn" data-answer-index="${index}" title="Copy answer to clipboard">
            <span class="copy-icon">📋</span>
            <span class="copy-text">Copy</span>
          </button>
        </div>
        ${methodologyBadge}
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
          ${this.formatAnswer(answer.full, 'full', answer.methodology)}
        </div>
      `;

      container.appendChild(answerSection);
    });
  }

  createMethodologyBadge(methodology, type) {
    const methodologyConfig = this.getMethodologyConfig(methodology, type);

    return `
      <div class="answer-methodology">
        <span class="methodology-badge ${methodologyConfig.cssClass}">${methodology}</span>
        <span class="methodology-tooltip" data-tooltip="${methodologyConfig.tooltip}">?</span>
      </div>
    `;
  }

  getMethodologyConfig(methodology, type) {
    const configs = {
      'SOAR Method': {
        cssClass: 'soar-method',
        tooltip: 'Situation, Obstacles, Actions, Results - proven framework for behavioral questions'
      },
      'Company Research': {
        cssClass: 'company-research',
        tooltip: 'Research-based answers showing knowledge of company values and culture'
      },
      'Self-Reflection': {
        cssClass: 'self-reflection',
        tooltip: 'Honest self-assessment with improvement strategies'
      },
      'Technical Explanation': {
        cssClass: 'technical-explanation',
        tooltip: 'Step-by-step breakdown with practical application'
      },
      'Career Planning': {
        cssClass: 'career-planning',
        tooltip: 'Realistic career progression with skill development focus'
      },
      'Market Research': {
        cssClass: 'market-research',
        tooltip: 'Market-informed salary discussion with value demonstration'
      },
      'Structured Response': {
        cssClass: 'structured-response',
        tooltip: 'Professional structured response with clear context and impact'
      }
    };

    return configs[methodology] || configs['Structured Response'];
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
    contentContainer.innerHTML = this.formatAnswer(answer[answerType], answerType, answer.methodology);
  }

  formatAnswer(content, type, methodology) {
    if (type === 'keyPoints') {
      const points = Array.isArray(content) ? content : [content];
      return `
        <div class="key-points-section">
          <div class="answer-title">Key Talking Points</div>
          <ul class="key-points-list">
            ${points.map(point => `<li>${this.sanitizeInput(point)}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    const cleanContent = this.sanitizeInput(content);
    const duration = type === 'full' ? '(2-3 minutes)' : '(60-90 seconds)';
    const label = type === 'full' ? 'Full Answer' : 'Concise Answer';

    // Apply framework formatting based on methodology
    const formattedContent = this.applyFrameworkFormatting(cleanContent, methodology);

    return `
      <div class="answer-framework">
        <div class="answer-title">${label} ${duration}</div>
        <div class="answer-content-text">${formattedContent}</div>
      </div>
    `;
  }

  applyFrameworkFormatting(content, methodology) {
    // Define framework patterns and their formatting
    const frameworkPatterns = {
      'SOAR Method': [
        { pattern: /\b(Situation:)/gi, replacement: '<div class="framework-section"><span class="framework-label">$1</span>' },
        { pattern: /\b(Obstacles:)/gi, replacement: '</div><div class="framework-section"><span class="framework-label">$1</span>' },
        { pattern: /\b(Actions:)/gi, replacement: '</div><div class="framework-section"><span class="framework-label">$1</span>' },
        { pattern: /\b(Results:)/gi, replacement: '</div><div class="framework-section"><span class="framework-label">$1</span>' }
      ],
      'Company Research': [
        { pattern: /\b(Research:)/gi, replacement: '<div class="framework-section"><span class="framework-label">$1</span>' },
        { pattern: /\b(Alignment:)/gi, replacement: '</div><div class="framework-section"><span class="framework-label">$1</span>' },
        { pattern: /\b(Examples:)/gi, replacement: '</div><div class="framework-section"><span class="framework-label">$1</span>' }
      ],
      'Self-Reflection': [
        { pattern: /\b(Awareness:)/gi, replacement: '<div class="framework-section"><span class="framework-label">$1</span>' },
        { pattern: /\b(Examples:)/gi, replacement: '</div><div class="framework-section"><span class="framework-label">$1</span>' },
        { pattern: /\b(Improvement:)/gi, replacement: '</div><div class="framework-section"><span class="framework-label">$1</span>' }
      ],
      'Career Planning': [
        { pattern: /\b(Skills:)/gi, replacement: '<div class="framework-section"><span class="framework-label">$1</span>' },
        { pattern: /\b(Growth:)/gi, replacement: '</div><div class="framework-section"><span class="framework-label">$1</span>' },
        { pattern: /\b(Alignment:)/gi, replacement: '</div><div class="framework-section"><span class="framework-label">$1</span>' }
      ],
      'Market Research': [
        { pattern: /\b(Research:)/gi, replacement: '<div class="framework-section"><span class="framework-label">$1</span>' },
        { pattern: /\b(Value:)/gi, replacement: '</div><div class="framework-section"><span class="framework-label">$1</span>' },
        { pattern: /\b(Flexibility:)/gi, replacement: '</div><div class="framework-section"><span class="framework-label">$1</span>' }
      ],
      'Technical Explanation': [
        { pattern: /\b(Concept:)/gi, replacement: '<div class="framework-section"><span class="framework-label">$1</span>' },
        { pattern: /\b(Method:)/gi, replacement: '</div><div class="framework-section"><span class="framework-label">$1</span>' },
        { pattern: /\b(Application:)/gi, replacement: '</div><div class="framework-section"><span class="framework-label">$1</span>' }
      ],
      'Structured Response': [
        { pattern: /\b(Context:)/gi, replacement: '<div class="framework-section"><span class="framework-label">$1</span>' },
        { pattern: /\b(Detail:)/gi, replacement: '</div><div class="framework-section"><span class="framework-label">$1</span>' },
        { pattern: /\b(Impact:)/gi, replacement: '</div><div class="framework-section"><span class="framework-label">$1</span>' }
      ]
    };

    let formattedContent = content;

    // Apply patterns for the specific methodology
    const patterns = frameworkPatterns[methodology];
    if (patterns) {
      patterns.forEach(({ pattern, replacement }) => {
        formattedContent = formattedContent.replace(pattern, replacement);
      });

      // Close the last framework section
      formattedContent += '</div>';
    }

    // Clean up redundant phrases that AI might generate
    formattedContent = formattedContent
      .replace(/The Situation was that/gi, '')
      .replace(/The Situation:/gi, '')
      .replace(/The Obstacles were/gi, '')
      .replace(/The Obstacles:/gi, '')
      .replace(/My Actions included/gi, '')
      .replace(/The Actions were/gi, '')
      .replace(/My Actions:/gi, '')
      .replace(/The Results were/gi, '')
      .replace(/The Results:/gi, '')
      .replace(/^\s*,/gm, '') // Remove leading commas
      .replace(/\s+/g, ' '); // Normalize whitespace

    return formattedContent;
  }

  // ===== COPY FUNCTIONALITY =====

  async copyAnswerToClipboard(answerIndex) {
    const answer = this.currentAnswers[answerIndex];
    if (!answer) return;

    // Get the currently active answer type
    const activeTab = document.querySelector(`.answer-tab[data-answer-index="${answerIndex}"].active`);
    const answerType = activeTab ? activeTab.dataset.answerType : 'full';

    // Get the content based on the active tab
    let content;
    switch (answerType) {
      case 'keyPoints':
        const points = Array.isArray(answer.keyPoints) ? answer.keyPoints : [answer.keyPoints];
        content = `Key Talking Points:\n${points.map((point, i) => `${i + 1}. ${point}`).join('\n')}`;
        break;
      case 'concise':
        content = answer.concise;
        break;
      default:
        content = answer.full;
    }

    // Create the final text with question context
    const textToCopy = `QUESTION: ${answer.question}\n\nANSWER:\n${this.stripHtmlFormatting(content)}`;

    try {
      await navigator.clipboard.writeText(textToCopy);
      this.showCopySuccess(answerIndex);
    } catch (error) {
      console.error('Copy failed:', error);
      // Fallback for older browsers
      this.fallbackCopyToClipboard(textToCopy, answerIndex);
    }
  }

  stripHtmlFormatting(htmlContent) {
    // Remove HTML tags and convert back to plain text with proper formatting
    return htmlContent
      .replace(/<div class="framework-section"><span class="framework-label">(.*?)<\/span>/gi, '\n\n**$1**\n')
      .replace(/<\/div>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<span class="framework-label">(.*?)<\/span>/gi, '**$1**')
      .replace(/<[^>]*>/g, '')
      .replace(/\n\n+/g, '\n\n')
      .trim();
  }

  fallbackCopyToClipboard(text, answerIndex) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      document.execCommand('copy');
      this.showCopySuccess(answerIndex);
    } catch (error) {
      console.error('Fallback copy failed:', error);
      this.showCopyError(answerIndex);
    } finally {
      document.body.removeChild(textArea);
    }
  }

  showCopySuccess(answerIndex) {
    const copyBtn = document.querySelector(`.copy-answer-btn[data-answer-index="${answerIndex}"]`);
    if (!copyBtn) return;

    const originalHTML = copyBtn.innerHTML;
    copyBtn.innerHTML = `
      <span class="copy-icon">✅</span>
      <span class="copy-text">Copied!</span>
    `;
    copyBtn.classList.add('copy-success');

    setTimeout(() => {
      copyBtn.innerHTML = originalHTML;
      copyBtn.classList.remove('copy-success');
    }, 2000);
  }

  showCopyError(answerIndex) {
    const copyBtn = document.querySelector(`.copy-answer-btn[data-answer-index="${answerIndex}"]`);
    if (!copyBtn) return;

    const originalHTML = copyBtn.innerHTML;
    copyBtn.innerHTML = `
      <span class="copy-icon">❌</span>
      <span class="copy-text">Failed</span>
    `;
    copyBtn.classList.add('copy-error');

    setTimeout(() => {
      copyBtn.innerHTML = originalHTML;
      copyBtn.classList.remove('copy-error');
    }, 2000);
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

      // Add activity tracking
      this.addActivity('session_saved', `Saved session: ${sessionData.role} at ${sessionData.companyName || 'Company'}`);

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
      <div class="session-card">
        <div class="session-card-header">
          <h3 class="session-title">${session.metadata?.jobTitle || session.role || 'Interview Session'}</h3>
          <span class="session-date">${this.formatDate(session.metadata?.createdAt || session.createdAt)}</span>
        </div>

        <div class="session-stats">
          <span class="stat-item">
            <span class="stat-icon">📝</span>
            <span class="stat-value">${session.questions?.length || 0} questions</span>
          </span>
          <span class="stat-item">
            <span class="stat-icon">💡</span>
            <span class="stat-value">${Object.keys(session.answers || {}).length} SOAR answers</span>
          </span>
        </div>

        <div class="session-actions">
          <div class="session-actions-row">
            <button class="btn-secondary" onclick="app.loadSession('${session.id}')">
              View Details
            </button>
            <button class="btn-secondary" onclick="app.deleteSession('${session.id}')">
              Delete
            </button>
          </div>

          <!-- NEW: Practice Live button -->
          <button class="btn-primary practice-live-btn"
                  onclick="app.practiceWithCoach('${session.id}')"
                  title="Practice these questions with AI interviewer">
            <span class="btn-icon">🎙️</span>
            <span class="btn-text">Practice Live Interview</span>
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

    // Add activity tracking
    this.addActivity('session_loaded', `Loaded session: ${session.role} at ${session.companyName || 'Company'}`);

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


  // ===== STATS TRACKING =====

  displayStats() {
    const statsGrid = document.getElementById('statsGrid');
    if (!statsGrid) return;

    const stats = [
      { label: 'Questions Generated', value: this.stats.totalQuestions, icon: '⚡' },
      { label: 'Tailored Answers Created', value: this.stats.totalAnswers, icon: '💡' },
      { label: 'Saved Sessions', value: this.savedSessions.length, icon: '💾' },
      { label: 'Days Active', value: this.calculateDaysActive(), icon: '📅' }
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
    if (!this.stats.activeDays || this.stats.activeDays.length === 0) return 0;
    return this.stats.activeDays.length;
  }

  displayActivityTimeline() {
    const timelineContainer = document.getElementById('timelineContent');
    if (!timelineContainer) return;

    if (!this.stats.recentActivity || this.stats.recentActivity.length === 0) {
      timelineContainer.innerHTML = `
        <div class="empty-activity">
          <p>No recent activity. Start generating questions to see your activity here!</p>
        </div>
      `;
      return;
    }

    timelineContainer.innerHTML = this.stats.recentActivity.map(activity => `
      <div class="activity-item">
        <div class="activity-icon">${this.getActivityIcon(activity.type)}</div>
        <div class="activity-content">
          <div class="activity-description">${activity.details}</div>
          <div class="activity-time">${this.formatRelativeTime(activity.timestamp)}</div>
        </div>
      </div>
    `).join('');
  }

  getActivityIcon(type) {
    const icons = {
      questions_generated: '⚡',
      answers_generated: '💡',
      session_saved: '💾',
      session_loaded: '📂'
    };
    return icons[type] || '📝';
  }

  formatRelativeTime(timestamp) {
    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffMs = now - activityTime;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays > 7) {
      return activityTime.toLocaleDateString();
    } else if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return diffMins > 0 ? `${diffMins} minute${diffMins > 1 ? 's' : ''} ago` : 'Just now';
    }
  }


  getDefaultStats() {
    return {
      totalQuestions: 0,
      totalAnswers: 0,
      firstActivity: null,
      lastActivity: null,
      activeDays: [],
      recentActivity: []
    };
  }

  saveStats() {
    try {
      if (!this.stats.firstActivity) {
        this.stats.firstActivity = new Date().toISOString();
      }
      this.stats.lastActivity = new Date().toISOString();

      // Track unique active days
      const today = new Date().toDateString();
      if (!this.stats.activeDays.includes(today)) {
        this.stats.activeDays.push(today);
      }

      localStorage.setItem('interview_oracle_pro_stats', JSON.stringify(this.stats));
    } catch (error) {
      console.error('Error saving stats:', error);
    }
  }

  addActivity(type, details) {
    const activity = {
      type,
      details,
      timestamp: new Date().toISOString()
    };

    this.stats.recentActivity.unshift(activity);

    // Keep only last 10 activities
    if (this.stats.recentActivity.length > 10) {
      this.stats.recentActivity = this.stats.recentActivity.slice(0, 10);
    }

    this.saveStats();
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

  showLoading(state, messageType = 'processing') {
    const loadingElement = document.getElementById('globalLoading');
    const loadingText = document.getElementById('loadingText');

    if (loadingElement) {
      if (state) {
        loadingElement.classList.remove('hidden');
        if (loadingText) {
          this.startRotatingMessages(messageType);
        }
      } else {
        loadingElement.classList.add('hidden');
        this.stopRotatingMessages();
      }
    }
  }

  startRotatingMessages(messageType) {
    const loadingText = document.getElementById('loadingText');
    if (!loadingText) return;

    const messages = this.getRotatingMessages(messageType);
    let currentIndex = 0;

    // Set initial message
    loadingText.textContent = messages[0];

    // Clear any existing interval
    if (this.rotatingInterval) {
      clearInterval(this.rotatingInterval);
    }

    // Start rotating messages every 3.5 seconds
    this.rotatingInterval = setInterval(() => {
      loadingText.style.opacity = '0.5';

      setTimeout(() => {
        currentIndex = (currentIndex + 1) % messages.length;
        loadingText.textContent = messages[currentIndex];
        loadingText.style.opacity = '1';
      }, 150);
    }, 3500);
  }

  stopRotatingMessages() {
    if (this.rotatingInterval) {
      clearInterval(this.rotatingInterval);
      this.rotatingInterval = null;
    }
  }

  getRotatingMessages(messageType) {
    const messageMap = {
      questions: [
        "Analyzing job requirements and company culture...",
        "Jeff & Mike's Tip: Great questions reveal what matters most to the role",
        "Generating personalized questions based on your experience level...",
        "Jeff & Mike's Tip: Behavioral questions are 60% of most interviews",
        "Matching questions to industry best practices...",
        "Jeff & Mike's Tip: Technical questions test both knowledge and problem-solving"
      ],
      answers: [
        "Generating tailored answers using proven methodologies...",
        "Jeff & Mike's Tip: SOAR method works best for behavioral questions",
        "Applying intelligent frameworks to each question type...",
        "Jeff & Mike's Tip: Research the company before answering 'Why us?' questions",
        "Crafting professional responses with key talking points...",
        "Jeff & Mike's Tip: Practice your answers out loud for better delivery"
      ],
      processing: [
        "Processing your request...",
        "Jeff & Mike's Tip: Preparation is the key to interview confidence",
        "Working on your interview materials...",
        "Jeff & Mike's Tip: Quality answers beat quantity every time"
      ]
    };

    return messageMap[messageType] || messageMap.processing;
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

  // ===== PRACTICE LIVE INTEGRATION =====

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
          job_title: session.metadata?.jobTitle || session.role || 'Practice Interview',
          company_name: session.companyName || '',
          role: session.role || '',
          experience_level: session.experienceLevel || '',
          questions: formattedQuestions,
          status: 'prepared',
          metadata: {
            oracle_session_id: session.id,
            generated_at: session.metadata?.createdAt || session.createdAt || new Date().toISOString(),
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
    // Flatten all questions from the session
    const allQuestions = [];

    // Handle different session structures
    if (session.questions && Array.isArray(session.questions)) {
      // Direct array of questions
      allQuestions.push(...session.questions);
    } else if (session.questions && typeof session.questions === 'object') {
      // Questions organized by category
      Object.values(session.questions).forEach(categoryQuestions => {
        if (Array.isArray(categoryQuestions)) {
          allQuestions.push(...categoryQuestions);
        }
      });
    }

    // Also include questions from currentQuestions if session structure has it
    if (session.currentQuestions) {
      Object.values(session.currentQuestions).forEach(categoryQuestions => {
        if (Array.isArray(categoryQuestions)) {
          allQuestions.push(...categoryQuestions);
        }
      });
    }

    return allQuestions.map((q, index) => {
      // Handle both string questions and object questions
      const questionText = typeof q === 'string' ? q : (q.text || q.question || q);
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

}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.app = new InterviewOraclePro();
});