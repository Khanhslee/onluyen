import { useEffect, useMemo, useState } from 'react'
import { questions, topicMeta, topics } from './data'
import type { Question, QuizMode, SavedResult, Topic } from './types'

type Screen = 'home' | 'quiz' | 'result' | 'review'
type Answers = Record<number, number>
type Marked = Record<number, boolean>
type ReviewFilter = 'all' | 'wrong' | 'correct' | 'marked'
type PoolType = 'basic' | 'hard'

type QuizState = {
  mode: QuizMode
  poolType: PoolType
  topic?: Topic
  poolTitle: string
  items: Question[]
  answers: Answers
  marked: Marked
  current: number
  startedAt: number
  elapsedSeconds: number
  finishedAt?: number
}

const shuffle = <T,>(items: T[]): T[] => [...items].sort(() => Math.random() - 0.5)

const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [quiz, setQuiz] = useState<QuizState | null>(null)
  const [savedResult, setSavedResult] = useState<SavedResult | null>(() => {
    try {
      const raw = localStorage.getItem('nckh-last-result')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })

  // Timer effect for quiz
  useEffect(() => {
    if (screen !== 'quiz' || !quiz || quiz.finishedAt) return
    const timer = setInterval(() => {
      setQuiz((prev) => (prev ? { ...prev, elapsedSeconds: prev.elapsedSeconds + 1 } : null))
    }, 1000)
    return () => clearInterval(timer)
  }, [screen, quiz?.finishedAt])

  const beginQuiz = (mode: QuizMode, poolType: PoolType, topic?: Topic) => {
    let pool: Question[] = []
    let poolTitle = ''

    if (topic) {
      pool = questions.filter((item) => item.topic === topic)
      poolTitle = `${topicMeta[topic].label} (${pool.length} câu)`
    } else if (poolType === 'hard') {
      pool = questions.filter((item) => item.topic === 'Đề khó')
      poolTitle = 'Đề siêu khó (40 câu)'
    } else {
      // 50 basic questions
      pool = questions.filter((item) => item.topic !== 'Đề khó')
      poolTitle = '50 câu cơ bản & trọng tâm'
    }

    const items = shuffle(pool).map((item) => {
      const shuffledOptions = shuffle(item.options.map((text, index) => ({ text, isAnswer: index === item.answer })))
      return {
        ...item,
        options: shuffledOptions.map((opt) => opt.text),
        answer: shuffledOptions.findIndex((opt) => opt.isAnswer),
      }
    })

    setQuiz({
      mode,
      poolType,
      topic,
      poolTitle,
      items,
      answers: {},
      marked: {},
      current: 0,
      startedAt: Date.now(),
      elapsedSeconds: 0,
    })
    setScreen('quiz')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const finishQuiz = () => {
    if (!quiz) return
    const score = quiz.items.reduce((acc, item) => acc + (quiz.answers[item.id] === item.answer ? 1 : 0), 0)
    const result: SavedResult = {
      score,
      total: quiz.items.length,
      completedAt: new Date().toISOString(),
      mode: quiz.mode,
      poolTitle: quiz.poolTitle,
      durationSeconds: quiz.elapsedSeconds,
    }
    try {
      localStorage.setItem('nckh-last-result', JSON.stringify(result))
    } catch {
      // ignore
    }
    setSavedResult(result)
    setQuiz({ ...quiz, finishedAt: Date.now() })
    setScreen('result')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const reset = () => {
    setQuiz(null)
    setScreen('home')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={reset} aria-label="Về trang chủ">
          <span className="brand-mark">N</span>
          <div>
            <strong>NCKH SPRINT</strong>
            <small>50 CƠ BẢN · 40 SIÊU KHÓ</small>
          </div>
        </button>
        <div className="topbar-right">
          <span className="topbar-badge">
            <span className="live-dot" /> Đề tách biệt 50 + 40
          </span>
        </div>
      </header>

      <main>
        {screen === 'home' && <HomeScreen onStart={beginQuiz} savedResult={savedResult} />}
        {screen === 'quiz' && quiz && (
          <QuizScreen quiz={quiz} setQuiz={setQuiz} onFinish={finishQuiz} onExit={reset} />
        )}
        {screen === 'result' && quiz && (
          <ResultScreen
            quiz={quiz}
            onReview={() => {
              setScreen('review')
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            onRetry={() => beginQuiz(quiz.mode, quiz.poolType, quiz.topic)}
            onHome={reset}
          />
        )}
        {screen === 'review' && quiz && (
          <ReviewScreen quiz={quiz} onBack={() => {
            setScreen('result')
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }} />
        )}
      </main>

      <footer className="site-footer">
        <span>NCKH Sprint · Ôn đúng trọng tâm, nhớ chắc phản xạ</span>
        <span>Biên soạn từ slide NCKH Y Dược</span>
      </footer>
    </div>
  )
}

/* ==========================================================================
   HOME SCREEN (SEPARATED 50 CÂU & 40 CÂU SIÊU KHÓ)
   ========================================================================== */
function HomeScreen({
  onStart,
  savedResult,
}: {
  onStart: (mode: QuizMode, poolType: PoolType, topic?: Topic) => void
  savedResult: SavedResult | null
}) {
  const [activeTab, setActiveTab] = useState<PoolType>('basic')

  // Non-hard topics for Tab 1
  const basicTopics = useMemo(() => topics.filter((t) => t !== 'Đề khó'), [])
  const basicQuestionsCount = useMemo(() => questions.filter((q) => q.topic !== 'Đề khó').length, [])
  const hardQuestionsCount = useMemo(() => questions.filter((q) => q.topic === 'Đề khó').length, [])

  return (
    <div className="home-page">
      {/* Pool Switcher (Tab 1: 50 câu cơ bản vs Tab 2: 40 câu siêu khó) */}
      <div className="pool-switcher-wrap">
        <div className="pool-switcher">
          <button
            className={`pool-tab ${activeTab === 'basic' ? 'active-basic' : ''}`}
            onClick={() => setActiveTab('basic')}
          >
            <span className="tab-icon">📚</span>
            <span>Bộ 50 câu cơ bản & Từng bài</span>
            <span className="tab-badge">{basicQuestionsCount} câu</span>
          </button>
          <button
            className={`pool-tab ${activeTab === 'hard' ? 'active-hard' : ''}`}
            onClick={() => setActiveTab('hard')}
          >
            <span className="tab-icon">🔥</span>
            <span>Đề siêu khó (Vận dụng cao)</span>
            <span className="tab-badge">{hardQuestionsCount} câu</span>
          </button>
        </div>
      </div>

      {/* TAB 1: 50 CÂU CƠ BẢN & LỘ TRÌNH TỪNG BÀI */}
      {activeTab === 'basic' && (
        <div className="tab-content basic-content">
          {/* Hero Banner for 50 Basic */}
          <div className="hero-card hero-basic">
            <div className="hero-header">
              <span className="hero-pill">50 CÂU TRỌNG TÂM · BÀI 1 ĐẾN 6 + PHỤ LỤC</span>
            </div>
            <h1 className="hero-title">
              Học chắc khái niệm.<br />
              <em>Nhớ lâu phản xạ.</em>
            </h1>
            <p className="hero-desc">
              Bộ câu hỏi chuẩn mực được chắt lọc từ 6 bài giảng chính và phụ lục đề cương,
              giúp củng cố định nghĩa, quy trình nghiên cứu, dữ liệu và báo cáo khoa học.
            </p>
            <div className="hero-actions">
              <button className="btn btn-primary" onClick={() => onStart('practice', 'basic')}>
                Ôn toàn bộ 50 câu <span>↗</span>
              </button>
              <button className="btn btn-outline" onClick={() => onStart('exam', 'basic')}>
                Thi thử tính điểm (50 câu)
              </button>
            </div>
          </div>

          {/* Section: Chế độ ôn tập */}
          <div className="section-title-wrap">
            <div>
              <p className="section-label">Lựa chọn chế độ</p>
              <h2 className="section-heading">Bắt đầu ôn luyện 50 câu</h2>
            </div>
            <span className="section-count">3 hình thức</span>
          </div>

          <div className="modes-grid">
            <article className="mode-card">
              <div className="mode-card-header">
                <span className="mode-badge">Khuyên dùng</span>
                <span className="mode-icon">💡</span>
              </div>
              <h3>Ôn toàn bộ 50 câu</h3>
              <p>Trộn ngẫu nhiên cả 50 câu, hiển thị đáp án và lời giải thích chi tiết ngay sau mỗi lựa chọn.</p>
              <button className="btn btn-primary btn-sm btn-block" onClick={() => onStart('practice', 'basic')}>
                Bắt đầu ôn tập <span>→</span>
              </button>
            </article>

            <article className="mode-card">
              <div className="mode-card-header">
                <span className="mode-badge">Mô phỏng thi</span>
                <span className="mode-icon">⏱</span>
              </div>
              <h3>Thi thử 50 câu</h3>
              <p>Mô phỏng phòng thi thật, không bật mí đáp án. Chấm điểm và phân tích năng lực sau khi nộp bài.</p>
              <button className="btn btn-outline btn-sm btn-block" onClick={() => onStart('exam', 'basic')}>
                Vào phòng thi <span>→</span>
              </button>
            </article>

            <article className="mode-card">
              <div className="mode-card-header">
                <span className="mode-badge">Chuyên sâu</span>
                <span className="mode-icon">🎯</span>
              </div>
              <h3>Luyện theo từng bài</h3>
              <p>Tập trung củng cố riêng một mảng bài học bạn đang thấy yếu nhất trong danh sách bên dưới.</p>
              <button
                className="btn btn-outline btn-sm btn-block"
                onClick={() => {
                  document.getElementById('topics-section')?.scrollIntoView({ behavior: 'smooth' })
                }}
              >
                Xem danh sách bài <span>↓</span>
              </button>
            </article>
          </div>

          {/* Section: Danh sách từng bài */}
          <div id="topics-section" className="section-title-wrap" style={{ marginTop: 16 }}>
            <div>
              <p className="section-label">Lộ trình 6 bài + Phụ lục</p>
              <h2 className="section-heading">Luyện tập theo từng chuyên đề</h2>
            </div>
            <span className="section-count">{basicTopics.length} chuyên mục</span>
          </div>

          <div className="topics-grid">
            {basicTopics.map((topic, index) => {
              const meta = topicMeta[topic]
              const qCount = questions.filter((q) => q.topic === topic).length
              return (
                <button
                  key={topic}
                  className="topic-card"
                  onClick={() => onStart('topic', 'basic', topic)}
                  title={`Luyện ${meta.label}`}
                >
                  <div className="topic-card-info">
                    <span className="topic-badge-num" style={{ backgroundColor: meta.color }}>
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div className="topic-card-text">
                      <strong>{meta.label}</strong>
                      <small>{meta.note}</small>
                    </div>
                  </div>
                  <div className="topic-card-action">
                    <span className="topic-question-count">{qCount} câu</span>
                    <span className="topic-arrow">→</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* TAB 2: ĐỀ SIÊU KHÓ (40 CÂU VẬN DỤNG CAO) */}
      {activeTab === 'hard' && (
        <div className="tab-content hard-content">
          {/* Hero Banner for Hard Exam */}
          <div className="hero-card hero-hard">
            <div className="hero-header">
              <span className="hero-pill">🔥 THỬ THÁCH VẬN DỤNG CAO · 40 CÂU TÌNH HUỐNG</span>
            </div>
            <h1 className="hero-title">
              Suy luận logic.<br />
              <em>Vượt qua bẫy đề thi.</em>
            </h1>
            <p className="hero-desc">
              40 câu hỏi được thiết kế riêng với các tình huống thực tiễn, phân tích thống kê (t-test, ANOVA, Chi-squared, Logistic, Cox, Poisson),
              tiêu chuẩn GLP/GCP, đạo đức nghiên cứu và các kỹ thuật ĐMST (SCAMPER, DOIT, Bloom, Sáu chiếc mũ).
            </p>
            <div className="hero-actions">
              <button className="btn btn-accent" onClick={() => onStart('practice', 'hard')}>
                Luyện tập đề khó (Xem giải thích) <span>↗</span>
              </button>
              <button className="btn btn-outline-dark" onClick={() => onStart('exam', 'hard')}>
                Thi thử thách thức (40 câu)
              </button>
            </div>
          </div>

          {/* Section: Chế độ đề khó */}
          <div className="section-title-wrap">
            <div>
              <p className="section-label">Chế độ thử thách</p>
              <h2 className="section-heading">Luyện đề siêu khó</h2>
            </div>
            <span className="section-count">40 câu độc lập</span>
          </div>

          <div className="modes-grid">
            <article className="mode-card" style={{ borderColor: '#ef9a9a' }}>
              <div className="mode-card-header">
                <span className="mode-badge" style={{ background: '#fee2e2', color: '#b91c1c' }}>
                  Học sâu & Đào sâu
                </span>
                <span className="mode-icon">📖</span>
              </div>
              <h3>Luyện tập đề khó (40 câu)</h3>
              <p>Làm từng câu và đọc ngay lập luận giải thích, căn cứ vào slide và thực tiễn y dược để hiểu bản chất.</p>
              <button className="btn btn-accent btn-sm btn-block" onClick={() => onStart('practice', 'hard')}>
                Bắt đầu luyện tập <span>→</span>
              </button>
            </article>

            <article className="mode-card" style={{ borderColor: '#ef9a9a' }}>
              <div className="mode-card-header">
                <span className="mode-badge" style={{ background: '#fee2e2', color: '#b91c1c' }}>
                  Thử thách giới hạn
                </span>
                <span className="mode-icon">⚡</span>
              </div>
              <h3>Thi thử Đề khó</h3>
              <p>Không có gợi ý trong lúc làm. Bài thi đòi hỏi tư duy nhanh, liên kết đa ngành và nhận diện bẫy câu hỏi.</p>
              <button className="btn btn-outline btn-sm btn-block" onClick={() => onStart('exam', 'hard')}>
                Vào thi thử ngay <span>→</span>
              </button>
            </article>
          </div>

          {/* Highlights in Hard Quiz */}
          <div className="section-title-wrap" style={{ marginTop: 16 }}>
            <div>
              <p className="section-label">Nội dung cốt lõi</p>
              <h2 className="section-heading">Các mảng kiến thức suy luận trong đề khó</h2>
            </div>
          </div>

          <div className="hard-highlights-grid">
            <div className="hard-highlight-box">
              <strong>Thống kê y học & Mô hình hồi quy</strong>
              <p>Phân biệt p-value, tương quan vs nhân quả, lựa chọn test (t-test, ANOVA, Chi-squared) và mô hình (Logistic, Cox, Poisson).</p>
            </div>
            <div className="hard-highlight-box">
              <strong>Liêm chính học thuật & Đạo đức</strong>
              <p>Xử lý tình huống GLP vs GCP, tự đạo văn, đạo văn bản dịch, giá trị can đảm (Courage) trong ICAI.</p>
            </div>
            <div className="hard-highlight-box">
              <strong>Thiết kế nghiên cứu & Bảng hỏi</strong>
              <p>Nhận diện lỗi Leading question, hiệu ứng Hawthorne, nguyên tắc sao lưu 3-2-1, các loại khoảng trống (Verification gap, Evidence gap).</p>
            </div>
            <div className="hard-highlight-box">
              <strong>Phương pháp ĐMST chuyên sâu</strong>
              <p>Ứng dụng DOIT, SCAMPER Combine, Empathy Map (Pain), Sáu chiếc mũ tư duy giải quyết mâu thuẫn, thang Bloom mức Tạo ra.</p>
            </div>
          </div>
        </div>
      )}

      {/* Recent Result Card */}
      {savedResult && (
        <div className="recent-result-card">
          <div className="recent-result-left">
            <span className="recent-icon">✓</span>
            <div className="recent-info">
              <p>Lần làm bài gần nhất · {savedResult.poolTitle}</p>
              <strong>
                {savedResult.score}/{savedResult.total} câu đúng ({Math.round((savedResult.score / savedResult.total) * 100)}%)
              </strong>
            </div>
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {new Date(savedResult.completedAt).toLocaleDateString('vi-VN')}
          </span>
        </div>
      )}
    </div>
  )
}

/* ==========================================================================
   QUIZ SCREEN (MOBILE-FIRST WITH THUMB BAR & BOTTOM SHEET)
   ========================================================================== */
function QuizScreen({
  quiz,
  setQuiz,
  onFinish,
  onExit,
}: {
  quiz: QuizState
  setQuiz: React.Dispatch<React.SetStateAction<QuizState | null>>
  onFinish: () => void
  onExit: () => void
}) {
  const [showMobileSheet, setShowMobileSheet] = useState(false)
  const [filterMode, setFilterMode] = useState<'all' | 'unanswered' | 'flagged'>('all')

  const item = quiz.items[quiz.current]
  const selected = quiz.answers[item.id]
  const isPractice = quiz.mode !== 'exam'
  const answeredCount = Object.keys(quiz.answers).length
  const isFlagged = Boolean(quiz.marked[item.id])
  const progressPercent = ((quiz.current + 1) / quiz.items.length) * 100
  const isHard = quiz.poolType === 'hard'

  const choose = (optionIndex: number) => {
    setQuiz((prev) => (prev ? { ...prev, answers: { ...prev.answers, [item.id]: optionIndex } } : null))
  }

  const toggleFlag = (id: number) => {
    setQuiz((prev) =>
      prev ? { ...prev, marked: { ...prev.marked, [id]: !prev.marked[id] } } : null
    )
  }

  const goToQuestion = (index: number) => {
    setQuiz((prev) => (prev ? { ...prev, current: index } : null))
    setShowMobileSheet(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const move = (step: number) => {
    const nextIndex = Math.min(quiz.items.length - 1, Math.max(0, quiz.current + step))
    goToQuestion(nextIndex)
  }

  const handleFinishPrompt = () => {
    const unanswered = quiz.items.length - answeredCount
    if (unanswered > 0) {
      const confirm = window.confirm(
        `Bạn vẫn còn ${unanswered} câu chưa trả lời. Bạn có chắc chắn muốn nộp bài ngay bây giờ?`
      )
      if (!confirm) return
    }
    onFinish()
  }

  const handleExitPrompt = () => {
    if (answeredCount > 0) {
      const confirm = window.confirm('Tiến trình làm bài hiện tại sẽ không được lưu. Bạn có muốn thoát?')
      if (!confirm) return
    }
    onExit()
  }

  // Filter map items
  const filteredMapIndices = useMemo(() => {
    return quiz.items
      .map((q, idx) => ({ q, idx }))
      .filter(({ q, idx }) => {
        if (filterMode === 'unanswered') return quiz.answers[q.id] === undefined
        if (filterMode === 'flagged') return Boolean(quiz.marked[q.id])
        return true
      })
  }, [quiz.items, quiz.answers, quiz.marked, filterMode])

  const isCorrectInPractice = selected !== undefined && selected === item.answer

  return (
    <div className="quiz-page">
      {/* Quiz Top Header Bar */}
      <div className="quiz-header-bar">
        <div className="quiz-header-left">
          <button className="btn btn-outline btn-sm" onClick={handleExitPrompt}>
            ← Thoát
          </button>
          <span className="quiz-pill-badge">
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: isHard ? 'var(--accent)' : 'var(--primary)',
              }}
            />
            {quiz.poolTitle}
          </span>
        </div>

        <div className="quiz-header-right">
          <span className="quiz-pill-badge timer-badge">
            ⏱ {formatTime(quiz.elapsedSeconds)}
          </span>

          {/* Mobile Button to Open Question Map Sheet */}
          <button
            className="btn btn-outline btn-sm"
            onClick={() => setShowMobileSheet(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            📋 {answeredCount}/{quiz.items.length}
          </button>
        </div>
      </div>

      {/* Progress Track */}
      <div className="quiz-progress-track">
        <div
          className={`quiz-progress-bar ${isHard ? 'hard-bar' : ''}`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* 2-Column Quiz Layout for Desktop */}
      <div className="quiz-layout">
        {/* Left Sidebar Question Map (Desktop Only) */}
        <aside className="quiz-sidebar">
          <div className="sidebar-header">
            <h4>Mục lục câu hỏi</h4>
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
              {answeredCount}/{quiz.items.length} đã làm
            </span>
          </div>

          <div className="sidebar-filters">
            <button
              className={`filter-btn ${filterMode === 'all' ? 'active' : ''}`}
              onClick={() => setFilterMode('all')}
            >
              Tất cả
            </button>
            <button
              className={`filter-btn ${filterMode === 'unanswered' ? 'active' : ''}`}
              onClick={() => setFilterMode('unanswered')}
            >
              Chưa làm
            </button>
            <button
              className={`filter-btn ${filterMode === 'flagged' ? 'active' : ''}`}
              onClick={() => setFilterMode('flagged')}
            >
              Đánh dấu 🚩
            </button>
          </div>

          <div className="map-grid-container">
            {filteredMapIndices.map(({ q, idx }) => {
              const isCurrent = idx === quiz.current
              const isAnswered = quiz.answers[q.id] !== undefined
              const hasFlag = Boolean(quiz.marked[q.id])
              return (
                <button
                  key={q.id}
                  className={`map-btn ${isCurrent ? 'current' : ''} ${isAnswered ? 'answered' : ''} ${hasFlag ? 'flagged' : ''}`}
                  onClick={() => goToQuestion(idx)}
                >
                  {String(idx + 1).padStart(2, '0')}
                </button>
              )
            })}
          </div>

          <div className="map-legend">
            <div className="legend-item">
              <span className="legend-dot legend-current" /> Đang xem
            </div>
            <div className="legend-item">
              <span className="legend-dot legend-done" /> Đã trả lời
            </div>
            <div className="legend-item">
              <span className="legend-dot legend-flag" /> Đánh dấu
            </div>
          </div>
        </aside>

        {/* Main Question Panel (Visible immediately on both Mobile & Desktop) */}
        <section className="quiz-main-panel">
          <div className="question-meta-row">
            <span className="topic-tag" style={{ backgroundColor: topicMeta[item.topic]?.color || 'var(--primary)' }}>
              {topicMeta[item.topic]?.label || item.topic}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                className={`btn btn-sm ${isFlagged ? 'btn-accent' : 'btn-outline'}`}
                onClick={() => toggleFlag(item.id)}
                title="Đánh dấu câu hỏi cần xem lại"
                style={{ padding: '4px 10px', fontSize: 11 }}
              >
                {isFlagged ? '🚩 Đã đánh dấu' : '🏳 Đánh dấu'}
              </button>
              <span className="question-number-tag">
                Câu {String(quiz.current + 1).padStart(2, '0')} / {quiz.items.length}
              </span>
            </div>
          </div>

          <h2 className="question-title">{item.title}</h2>

          {/* Options */}
          <div className="options-list">
            {item.options.map((optionText, optIdx) => {
              let optClass = ''
              let statusLabel = ''

              if (isPractice && selected !== undefined) {
                if (optIdx === item.answer) {
                  optClass = 'correct'
                  statusLabel = 'Đúng'
                } else if (optIdx === selected) {
                  optClass = 'wrong'
                  statusLabel = 'Sai'
                }
              } else if (selected === optIdx) {
                optClass = 'selected'
              }

              return (
                <button
                  key={optionText}
                  className={`option-btn ${optClass}`}
                  onClick={() => choose(optIdx)}
                  disabled={isPractice && selected !== undefined}
                >
                  <span className="option-badge">{String.fromCharCode(65 + optIdx)}</span>
                  <span className="option-text">{optionText}</span>
                  {statusLabel === 'Đúng' && (
                    <span className="status-badge status-correct">✓ Đúng</span>
                  )}
                  {statusLabel === 'Sai' && (
                    <span className="status-badge status-wrong">✕ Sai</span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Practice Explanation Box */}
          {isPractice && selected !== undefined && (
            <div className={`explanation-card ${isCorrectInPractice ? 'correct-exp' : ''}`}>
              <div className="exp-header">
                {isCorrectInPractice ? '🎉 Chính xác!' : '💡 Xem lại kiến thức này:'}
              </div>
              <p className="exp-text">{item.explanation}</p>
              <span className="exp-source">Nguồn: {item.source}</span>
            </div>
          )}

          {/* Desktop Actions Row */}
          <div className="desktop-actions-row">
            <button
              className="btn btn-outline"
              onClick={() => move(-1)}
              disabled={quiz.current === 0}
            >
              ← Câu trước
            </button>

            {quiz.current === quiz.items.length - 1 ? (
              <button
                className={`btn ${isHard ? 'btn-accent' : 'btn-primary'}`}
                onClick={handleFinishPrompt}
              >
                Nộp bài & Chấm điểm <span>✓</span>
              </button>
            ) : (
              <button
                className={`btn ${isHard ? 'btn-accent' : 'btn-primary'}`}
                onClick={() => move(1)}
              >
                Câu tiếp theo <span>→</span>
              </button>
            )}
          </div>
        </section>
      </div>

      {/* Sticky Bottom Navigation Bar for Mobile (Thumb-Friendly!) */}
      <div className="sticky-bottom-bar">
        <div className="sticky-bottom-bar-content">
          <button
            className="btn btn-outline btn-sm"
            onClick={() => move(-1)}
            disabled={quiz.current === 0}
          >
            ← Trước
          </button>

          <button
            className={`btn btn-sm ${isFlagged ? 'btn-accent' : 'btn-outline'}`}
            onClick={() => toggleFlag(item.id)}
          >
            {isFlagged ? '🚩 Cờ' : '🏳 Cờ'}
          </button>

          {quiz.current === quiz.items.length - 1 ? (
            <button
              className={`btn btn-sm ${isHard ? 'btn-accent' : 'btn-primary'}`}
              onClick={handleFinishPrompt}
            >
              Nộp bài ✓
            </button>
          ) : (
            <button
              className={`btn btn-sm ${isHard ? 'btn-accent' : 'btn-primary'}`}
              onClick={() => move(1)}
            >
              Tiếp theo →
            </button>
          )}
        </div>
      </div>

      {/* Mobile Bottom Sheet Drawer for Question Map */}
      {showMobileSheet && (
        <div className="bottom-sheet-backdrop" onClick={() => setShowMobileSheet(false)}>
          <div className="bottom-sheet-content" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="sheet-header">
              <h3>Danh sách câu hỏi</h3>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setShowMobileSheet(false)}
              >
                ✕ Đóng
              </button>
            </div>

            <div className="sidebar-filters" style={{ marginBottom: 16 }}>
              <button
                className={`filter-btn ${filterMode === 'all' ? 'active' : ''}`}
                onClick={() => setFilterMode('all')}
              >
                Tất cả ({quiz.items.length})
              </button>
              <button
                className={`filter-btn ${filterMode === 'unanswered' ? 'active' : ''}`}
                onClick={() => setFilterMode('unanswered')}
              >
                Chưa làm ({quiz.items.length - answeredCount})
              </button>
              <button
                className={`filter-btn ${filterMode === 'flagged' ? 'active' : ''}`}
                onClick={() => setFilterMode('flagged')}
              >
                Đánh dấu 🚩 ({Object.values(quiz.marked).filter(Boolean).length})
              </button>
            </div>

            <div className="map-grid-container" style={{ gridTemplateColumns: 'repeat(6, 1fr)', maxHeight: '50vh' }}>
              {filteredMapIndices.map(({ q, idx }) => {
                const isCurrent = idx === quiz.current
                const isAnswered = quiz.answers[q.id] !== undefined
                const hasFlag = Boolean(quiz.marked[q.id])
                return (
                  <button
                    key={q.id}
                    className={`map-btn ${isCurrent ? 'current' : ''} ${isAnswered ? 'answered' : ''} ${hasFlag ? 'flagged' : ''}`}
                    onClick={() => goToQuestion(idx)}
                  >
                    {String(idx + 1).padStart(2, '0')}
                  </button>
                )
              })}
            </div>

            <div style={{ marginTop: 20 }}>
              <button
                className={`btn btn-block ${isHard ? 'btn-accent' : 'btn-primary'}`}
                onClick={() => {
                  setShowMobileSheet(false)
                  handleFinishPrompt()
                }}
              >
                Nộp bài ngay ({answeredCount}/{quiz.items.length}) <span>✓</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ==========================================================================
   RESULT SCREEN
   ========================================================================== */
function ResultScreen({
  quiz,
  onReview,
  onRetry,
  onHome,
}: {
  quiz: QuizState
  onReview: () => void
  onRetry: () => void
  onHome: () => void
}) {
  const score = quiz.items.reduce((sum, item) => sum + (quiz.answers[item.id] === item.answer ? 1 : 0), 0)
  const percent = Math.round((score / quiz.items.length) * 100)
  const isHard = quiz.poolType === 'hard'

  const evaluation = useMemo(() => {
    if (percent >= 90) return { title: 'Xuất sắc!', desc: 'Bạn đã nắm rất vững kiến thức và phản xạ cực tốt.', badge: '🏆 Hạng A' }
    if (percent >= 75) return { title: 'Rất tốt!', desc: 'Kết quả ấn tượng, chỉ cần rà soát lại vài câu chưa chuẩn.', badge: '🎉 Hạng B' }
    if (percent >= 50) return { title: 'Đạt yêu cầu!', desc: 'Đã nắm được các ý cơ bản, nên ôn lại những câu sai.', badge: '👍 Hạng C' }
    return { title: 'Cần củng cố thêm!', desc: 'Hãy đọc kỹ phần giải thích chi tiết để nắm chắc lại lý thuyết.', badge: '📚 Cần ôn tập' }
  }, [percent])

  // Topic scores
  const topicScores = useMemo(() => {
    return topics
      .map((topic) => {
        const list = quiz.items.filter((item) => item.topic === topic)
        if (!list.length) return null
        const correctCount = list.filter((item) => quiz.answers[item.id] === item.answer).length
        return {
          topic,
          score: correctCount,
          total: list.length,
          percent: Math.round((correctCount / list.length) * 100),
        }
      })
      .filter((t): t is NonNullable<typeof t> => t !== null)
  }, [quiz.items, quiz.answers])

  return (
    <div className="result-page">
      <div className="result-hero-card">
        <div>
          <span
            className="result-badge"
            style={{
              backgroundColor: isHard ? 'var(--accent-light)' : 'var(--primary-light)',
              color: isHard ? 'var(--accent)' : 'var(--primary)',
            }}
          >
            {quiz.poolTitle} · {evaluation.badge}
          </span>
          <h1>
            {evaluation.title} Bạn đạt <em>{percent}%</em>
          </h1>
          <p className="result-sub">
            {evaluation.desc} (Thời gian làm bài: {formatTime(quiz.elapsedSeconds)})
          </p>
        </div>

        <div className={`score-circle ${isHard ? 'hard-score' : ''}`}>
          <span className="score-circle-num">{score}</span>
          <span className="score-circle-denom">/ {quiz.items.length} câu</span>
        </div>
      </div>

      <div className="result-actions-row">
        <button className={`btn ${isHard ? 'btn-accent' : 'btn-primary'}`} onClick={onReview}>
          Xem lại đáp án & giải thích <span>↗</span>
        </button>
        <button className="btn btn-outline" onClick={onRetry}>
          Làm lại đề này
        </button>
        <button className="btn btn-outline" onClick={onHome}>
          Về trang chủ
        </button>
      </div>

      {/* Topic breakdown */}
      <div className="breakdown-card">
        <div className="section-title-wrap">
          <div>
            <p className="section-label">Bản đồ kết quả</p>
            <h3 className="section-heading">Tỷ lệ chính xác theo chuyên đề</h3>
          </div>
          <span className="section-count">{topicScores.length} chuyên mục</span>
        </div>

        {topicScores.map(({ topic, score: tScore, total: tTotal, percent: tPercent }) => {
          const meta = topicMeta[topic]
          return (
            <div className="breakdown-row" key={topic}>
              <div className="breakdown-label">
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: meta?.color || 'var(--primary)',
                  }}
                />
                <span>{meta?.label || topic}</span>
              </div>
              <div className="breakdown-bar-track">
                <div
                  className="breakdown-bar-fill"
                  style={{
                    width: `${tPercent}%`,
                    backgroundColor: meta?.color || 'var(--primary)',
                  }}
                />
              </div>
              <span className="breakdown-score">
                {tScore}/{tTotal} ({tPercent}%)
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ==========================================================================
   REVIEW SCREEN (WITH QUICK FILTERS FOR WRONG/CORRECT/FLAGGED)
   ========================================================================== */
function ReviewScreen({
  quiz,
  onBack,
}: {
  quiz: QuizState
  onBack: () => void
}) {
  const [filter, setFilter] = useState<ReviewFilter>('all')

  const wrongCount = quiz.items.filter((item) => quiz.answers[item.id] !== item.answer).length
  const correctCount = quiz.items.length - wrongCount
  const markedCount = Object.values(quiz.marked).filter(Boolean).length

  const filteredItems = useMemo(() => {
    return quiz.items.filter((item) => {
      const isCorrect = quiz.answers[item.id] === item.answer
      if (filter === 'wrong') return !isCorrect
      if (filter === 'correct') return isCorrect
      if (filter === 'marked') return Boolean(quiz.marked[item.id])
      return true
    })
  }, [quiz.items, quiz.answers, quiz.marked, filter])

  return (
    <div className="review-page">
      <div className="review-header-card">
        <div>
          <button className="btn btn-outline btn-sm" onClick={onBack} style={{ marginBottom: 8 }}>
            ← Quay lại kết quả
          </button>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700 }}>
            Đối chiếu đáp án & Lời giải
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            Đúng: <strong>{correctCount}</strong> · Sai: <strong>{wrongCount}</strong> · Đã đánh dấu:{' '}
            <strong>{markedCount}</strong>
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="review-filter-bar">
        <button
          className={`review-filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          Tất cả ({quiz.items.length})
        </button>
        <button
          className={`review-filter-btn ${filter === 'wrong' ? 'active' : ''}`}
          onClick={() => setFilter('wrong')}
          style={{ borderColor: filter === 'wrong' ? 'var(--danger)' : undefined, color: filter === 'wrong' ? '#fff' : 'var(--danger)', background: filter === 'wrong' ? 'var(--danger)' : undefined }}
        >
          ❌ Câu sai ({wrongCount})
        </button>
        <button
          className={`review-filter-btn ${filter === 'correct' ? 'active' : ''}`}
          onClick={() => setFilter('correct')}
        >
          ✅ Câu đúng ({correctCount})
        </button>
        {markedCount > 0 && (
          <button
            className={`review-filter-btn ${filter === 'marked' ? 'active' : ''}`}
            onClick={() => setFilter('marked')}
          >
            🚩 Đã đánh dấu ({markedCount})
          </button>
        )}
      </div>

      {/* List */}
      <div className="review-list">
        {filteredItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
            Không có câu hỏi nào trong mục này.
          </div>
        ) : (
          filteredItems.map((item, originalIndex) => {
            const selected = quiz.answers[item.id]
            const isCorrect = selected === item.answer
            return (
              <article
                className={`review-card ${isCorrect ? 'correct-item' : 'wrong-item'}`}
                key={item.id}
              >
                <div className="review-card-top">
                  <span
                    className="topic-tag"
                    style={{
                      backgroundColor: topicMeta[item.topic]?.color || 'var(--primary)',
                      fontSize: 10,
                      padding: '2px 8px',
                    }}
                  >
                    {item.topic}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {quiz.marked[item.id] && <span title="Đã đánh dấu">🚩</span>}
                    <strong style={{ color: isCorrect ? 'var(--success)' : 'var(--danger)', fontSize: 12 }}>
                      {isCorrect ? '✓ Đúng' : '✕ Chưa đúng'}
                    </strong>
                  </div>
                </div>

                <h3 className="review-card-title">{item.title}</h3>

                <div className="review-answer-row correct-ans">
                  ✓ <strong>Đáp án đúng:</strong> {item.options[item.answer]}
                </div>

                {selected !== undefined && !isCorrect && (
                  <div className="review-answer-row your-ans">
                    ✕ <strong>Bạn đã chọn:</strong> {item.options[selected]}
                  </div>
                )}

                {selected === undefined && (
                  <div className="review-answer-row your-ans">
                    ○ <strong>Chưa trả lời câu này</strong>
                  </div>
                )}

                <div className="review-card-exp">
                  <strong>Giải thích:</strong> {item.explanation}
                  <div style={{ marginTop: 4, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                    Nguồn: {item.source}
                  </div>
                </div>
              </article>
            )
          })
        )}
      </div>
    </div>
  )
}

export default App
