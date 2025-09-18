# Interview Oracle PRO

A comprehensive, AI-powered interview preparation suite with advanced features for professional job seekers.

## 🚀 Features

### Enhanced Question Generation
- **12-15 Questions** (vs 8 in free version)
- **Company-specific questions** tailored to the organization
- **Experience level filtering** (Entry, Mid, Senior, Lead/Manager, Executive)
- **Unlimited usage** for PRO members

### SOAR Answer Generation
- **Complete SOAR framework** (Situation, Obstacles, Actions, Results)
- **Multiple answer formats**:
  - Full Answer (2-3 minutes, 250-300 words)
  - Concise Answer (30-60 seconds, 80-120 words)
  - Key Points (bullet format)
- **4 Answer styles**: Confident, Humble, Technical, Leadership

### Practice Mode
- **Timer functionality** with customizable time limits
- **Recording simulation** with visual indicators
- **Practice tips** and guidance
- **Session statistics** tracking
- **Progress tracking** across questions

### Session Management
- **Save sessions** with all questions and answers
- **Card-based interface** for saved sessions
- **Export functionality** (PDF/text format)
- **View/Practice/Export** actions per session
- **Session metadata** (creation date, question count, etc.)

### Analytics Dashboard
- **Usage statistics**: Questions generated, answers created, practice time
- **Activity timeline** showing recent actions
- **Streak tracking** for consistent usage
- **Performance metrics** and insights

### Enhanced UI/UX
- **Tabbed navigation** (Generate | Answers | Practice | Saved | Stats)
- **PRO badge** and member welcome
- **Dark theme** with #2EB1BC accent color
- **Responsive design** for all devices
- **Question selection** with checkboxes
- **Category-based organization**

## 🛠️ Technology Stack

- **Frontend**: Pure JavaScript, CSS Grid & Flexbox
- **Backend**: Netlify Functions with Claude 3 API
- **Storage**: LocalStorage for client-side persistence
- **Analytics**: Google Analytics 4 integration

## 🚀 Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/theignetwork/interview-oracle-pro.git
   cd interview-oracle-pro
   ```

2. **Set up environment variables**
   ```bash
   # Add to Netlify environment variables
   CLAUDE_API_KEY=your_claude_api_key_here
   ```

3. **Deploy to Netlify**
   - Connect this repository to Netlify
   - Set up the environment variable
   - Deploy!

## 📁 Project Structure

```
interview-oracle-pro/
├── index.html              # Main PRO interface
├── style.css               # Enhanced styling
├── app.js                  # JavaScript application
├── netlify.toml            # Netlify configuration
├── package.json            # Project metadata
├── README.md               # This file
└── api/                    # Netlify Functions
    ├── generate-questions.js  # Enhanced for 12+ questions
    ├── generate-answers.js    # SOAR answer generation
    └── save-session.js        # Session management
```

## 🎯 Usage

### Generate Questions
1. Paste job description in the enhanced form
2. Select role, experience level, and company name
3. Generate 12-15 personalized questions

### Create SOAR Answers
1. Select questions using checkboxes
2. Navigate to "Answers" tab
3. Choose answer style (Confident/Humble/Technical/Leadership)
4. Generate comprehensive SOAR method answers

### Practice Mode
1. Go to "Practice" tab
2. Select question type and time limit
3. Practice with timer and recording simulation
4. Review completion statistics

### Session Management
1. Save sessions from the Generate tab
2. Access saved sessions in "Saved" tab
3. View, practice, or export any session
4. Track usage in "Stats" dashboard

## 🔧 Configuration

All configuration is handled through Netlify:
- Environment variables for API keys
- Automatic builds and deployments
- CDN distribution for fast loading

## 📊 Analytics

Built-in analytics tracking includes:
- Question generation events
- Answer creation metrics
- Practice session completion
- User engagement patterns

## 🎨 Customization

The PRO version uses CSS custom properties for easy theming:
- `--primary-color`: #2EB1BC (accent color)
- `--background-dark`: #0F1419 (dark background)
- `--surface-dark`: #192734 (surface color)

## 📱 Mobile Support

Fully responsive design with:
- Touch-friendly interfaces
- Optimized mobile practice mode
- Progressive Web App capabilities

## 🔒 Security

- Client-side session management
- No sensitive data storage
- CORS-enabled APIs
- Environment variable protection

## 📄 License

© 2024 The Interview Guys. All rights reserved.

---

**Interview Oracle PRO** - The ultimate AI-powered interview preparation suite for serious job seekers.