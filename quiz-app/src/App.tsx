import { useEffect, useMemo, useState } from 'react'
import { questions, topicMeta, topics } from './data'
import type { Question, QuizMode, Topic } from './types'

type Screen = 'home' | 'quiz' | 'result' | 'review'
type Answers = Record<number, number>
type SavedResult = { score: number; total: number; completedAt: string; mode: QuizMode }

type QuizState = {
  mode: QuizMode
  topic?: Topic
  items: Question[]
  answers: Answers
  current: number
  startedAt: number
  finishedAt?: number
}

const shuffle = <T,>(items: T[]): T[] => [...items].sort(() => Math.random() - 0.5)

function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [quiz, setQuiz] = useState<QuizState | null>(null)
  const [savedResult, setSavedResult] = useState<SavedResult | null>(() => {
    const raw = localStorage.getItem('nckh-last-result')
    return raw ? JSON.parse(raw) : null
  })

  const beginQuiz = (mode: QuizMode, topic?: Topic) => {
    const pool = topic ? questions.filter((item) => item.topic === topic) : questions
    const items = shuffle(pool).map((item) => {
      const shuffledOptions = shuffle(item.options.map((text, index) => ({ text, isAnswer: index === item.answer })))
      return { ...item, options: shuffledOptions.map((option) => option.text), answer: shuffledOptions.findIndex((option) => option.isAnswer) }
    })
    setQuiz({ mode, topic, items, answers: {}, current: 0, startedAt: Date.now() })
    setScreen('quiz')
  }

  const finishQuiz = () => {
    if (!quiz) return
    const result = { score: quiz.items.reduce((score, item) => score + (quiz.answers[item.id] === item.answer ? 1 : 0), 0), total: quiz.items.length, completedAt: new Date().toISOString(), mode: quiz.mode }
    localStorage.setItem('nckh-last-result', JSON.stringify(result))
    setSavedResult(result)
    setQuiz({ ...quiz, finishedAt: Date.now() })
    setScreen('result')
  }

  const reset = () => {
    setQuiz(null)
    setScreen('home')
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={reset} aria-label="Về trang chủ">
          <span className="brand-mark">N</span>
          <span><strong>NCKH</strong><small>SPRINT / 50</small></span>
        </button>
        <div className="topbar-meta"><span className="live-dot" /> Kho kiến thức 6 bài</div>
      </header>
      <main>
        {screen === 'home' && <HomeScreen onStart={beginQuiz} savedResult={savedResult} />}
        {screen === 'quiz' && quiz && <QuizScreen quiz={quiz} setQuiz={setQuiz} onFinish={finishQuiz} onExit={reset} />}
        {screen === 'result' && quiz && <ResultScreen quiz={quiz} onReview={() => setScreen('review')} onRetry={() => beginQuiz(quiz.mode, quiz.topic)} onHome={reset} />}
        {screen === 'review' && quiz && <ReviewScreen quiz={quiz} onBack={() => setScreen('result')} />}
      </main>
      <footer className="site-footer"><span>Ôn đúng trọng tâm.</span><span>Biên soạn từ NCKH_on_thi_markdown</span></footer>
    </div>
  )
}

function HomeScreen({ onStart, savedResult }: { onStart: (mode: QuizMode, topic?: Topic) => void; savedResult: SavedResult | null }) {
  const [selectedTopic, setSelectedTopic] = useState<Topic>('Bài 1')
  return (
    <div className="home-page">
      <section className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow">Nghiên cứu khoa học / phiên ôn tập 01</p>
          <h1>Học chắc.<br /><em>Nhớ lâu.</em></h1>
          <p className="hero-description">Bộ câu hỏi trắc nghiệm được chắt lọc từ 6 bài giảng, giúp bạn đi từ khái niệm đến phản xạ làm bài.</p>
          <div className="hero-actions"><button className="primary-button" onClick={() => onStart('practice')}>Bắt đầu ôn tập <span>↗</span></button><span className="hero-caption">50 câu / trộn ngẫu nhiên</span></div>
        </div>
        <div className="hero-stamp"><span>6</span><small>chủ đề<br />cốt lõi</small><b>+</b><span>50</span><small>câu hỏi<br />thực chiến</small></div>
      </section>

      <section className="mode-section">
        <div className="section-heading"><div><p className="eyebrow">Chọn nhịp học</p><h2>Bắt đầu theo cách của bạn</h2></div><span className="section-index">01 / 03</span></div>
        <div className="mode-grid">
          <ModeCard number="01" title="Ôn toàn bộ" description="Lướt qua 50 câu, xem đáp án và giải thích ngay sau mỗi lựa chọn." action="Ôn 50 câu" onClick={() => onStart('practice')} featured />
          <ModeCard number="02" title="Theo bài" description="Tập trung vào một chủ đề đang cần củng cố nhất." action="Chọn bài" onClick={() => document.getElementById('topics')?.scrollIntoView({ behavior: 'smooth' })} />
          <ModeCard number="03" title="Thi thử" description="50 câu, không bật mí đáp án. Chấm điểm sau khi nộp bài." action="Vào phòng thi" onClick={() => onStart('exam')} />
        </div>
      </section>

      <section className="topics-section" id="topics">
        <div className="section-heading"><div><p className="eyebrow">Lộ trình 6 bài</p><h2>Chọn một mảng để đào sâu</h2></div><span className="section-index">02 / 03</span></div>
        <div className="topic-list">{topics.slice(0, 6).map((topic, index) => <button className={`topic-row ${selectedTopic === topic ? 'selected' : ''}`} key={topic} onClick={() => setSelectedTopic(topic)}><span className="topic-number">0{index + 1}</span><span className="topic-color" style={{ backgroundColor: topicMeta[topic].color }} /><span className="topic-name"><strong>{topicMeta[topic].label}</strong><small>{topicMeta[topic].note}</small></span><span className="topic-count">{questions.filter((item) => item.topic === topic).length} câu</span><span className="row-arrow">↗</span></button>)}</div>
        <div className="topic-cta"><div><span className="eyebrow">Đang chọn</span><strong>{topicMeta[selectedTopic].label}</strong><small>{topicMeta[selectedTopic].note}</small></div><button className="dark-button" onClick={() => onStart('topic', selectedTopic)}>Luyện bài này <span>→</span></button></div>
      </section>

      <section className="last-result">{savedResult ? <><span className="result-icon">✓</span><div><span className="eyebrow">Lần gần nhất</span><strong>{savedResult.score}/{savedResult.total} câu đúng</strong></div><span className="result-date">{new Date(savedResult.completedAt).toLocaleDateString('vi-VN')}</span></> : <><span className="result-icon hollow">○</span><div><span className="eyebrow">Chưa có lịch sử</span><strong>Hoàn thành một lượt để lưu kết quả</strong></div></>}</section>
    </div>
  )
}

function ModeCard({ number, title, description, action, onClick, featured = false }: { number: string; title: string; description: string; action: string; onClick: () => void; featured?: boolean }) {
  return <article className={`mode-card ${featured ? 'featured' : ''}`}><span className="card-number">{number}</span><h3>{title}</h3><p>{description}</p><button onClick={onClick}>{action} <span>↗</span></button></article>
}

function QuizScreen({ quiz, setQuiz, onFinish, onExit }: { quiz: QuizState; setQuiz: (quiz: QuizState) => void; onFinish: () => void; onExit: () => void }) {
  const item = quiz.items[quiz.current]
  const selected = quiz.answers[item.id]
  const isPractice = quiz.mode !== 'exam'
  const answeredCount = Object.keys(quiz.answers).length
  const progress = ((quiz.current + 1) / quiz.items.length) * 100
  const choose = (option: number) => setQuiz({ ...quiz, answers: { ...quiz.answers, [item.id]: option } })
  const move = (direction: number) => setQuiz({ ...quiz, current: Math.min(quiz.items.length - 1, Math.max(0, quiz.current + direction)) })
  const correct = selected === item.answer
  return <div className="quiz-page"><div className="quiz-topline"><button className="text-button" onClick={onExit}>← Thoát</button><span className="quiz-mode">{quiz.mode === 'exam' ? 'Thi thử' : quiz.topic || 'Ôn toàn bộ'}</span><span>{answeredCount}/{quiz.items.length} đã chọn</span></div><div className="progress-track"><span style={{ width: `${progress}%` }} /></div><div className="quiz-layout"><aside className="question-map"><p className="eyebrow">Mục lục câu hỏi</p><div className="map-grid">{quiz.items.map((question, index) => <button key={question.id} className={`${index === quiz.current ? 'current' : ''} ${quiz.answers[question.id] !== undefined ? 'answered' : ''}`} onClick={() => setQuiz({ ...quiz, current: index })}>{String(index + 1).padStart(2, '0')}</button>)}</div><div className="map-key"><span><i className="key-current" /> hiện tại</span><span><i className="key-answer" /> đã chọn</span></div></aside><section className="question-panel"><div className="question-meta"><span className="topic-pill" style={{ backgroundColor: topicMeta[item.topic].color }}>{item.topic}</span><span>Câu {String(quiz.current + 1).padStart(2, '0')} / {quiz.items.length}</span></div><h1>{item.title}</h1><div className="option-list">{item.options.map((option, index) => { const state = selected !== undefined && isPractice ? (index === item.answer ? 'correct' : index === selected ? 'wrong' : '') : selected === index ? 'selected' : ''; return <button className={`option ${state}`} key={option} onClick={() => choose(index)} disabled={isPractice && selected !== undefined}><span className="option-letter">{String.fromCharCode(65 + index)}</span><span>{option}</span>{state === 'correct' && <b>Đúng</b>}{state === 'wrong' && <b>Sai</b>}</button> })}</div>{selected !== undefined && isPractice && <div className={`explanation ${correct ? 'positive' : ''}`}><strong>{correct ? 'Chính xác.' : 'Xem lại ý này.'}</strong><span>{item.explanation}</span><small>{item.source}</small></div>}<div className="question-actions"><button className="text-button" onClick={() => move(-1)} disabled={quiz.current === 0}>← Câu trước</button>{quiz.current === quiz.items.length - 1 ? <button className="primary-button" onClick={onFinish}>Nộp bài <span>✓</span></button> : <button className="dark-button" onClick={() => move(1)}>Câu tiếp theo <span>→</span></button>}</div></section></div></div>
}

function ResultScreen({ quiz, onReview, onRetry, onHome }: { quiz: QuizState; onReview: () => void; onRetry: () => void; onHome: () => void }) {
  const score = quiz.items.reduce((sum, item) => sum + (quiz.answers[item.id] === item.answer ? 1 : 0), 0)
  const percent = Math.round((score / quiz.items.length) * 100)
  const topicScores = topics.map((topic) => { const list = quiz.items.filter((item) => item.topic === topic); return { topic, score: list.filter((item) => quiz.answers[item.id] === item.answer).length, total: list.length } }).filter((item) => item.total)
  return <div className="result-page"><div className="result-hero"><p className="eyebrow">Kết quả phiên {quiz.mode === 'exam' ? 'thi thử' : 'ôn tập'}</p><h1>Bạn đã đi được<br /><em>{percent}% chặng đường.</em></h1><div className="score-orbit"><strong>{score}</strong><span>/ {quiz.items.length}<small>câu đúng</small></span></div></div><div className="result-body"><div className="result-actions"><button className="primary-button" onClick={onRetry}>Làm lại <span>↗</span></button><button className="outline-button" onClick={onReview}>Xem lại đáp án</button><button className="text-button" onClick={onHome}>Về trang chủ</button></div><div className="breakdown"><div className="section-heading"><div><p className="eyebrow">Bản đồ kết quả</p><h2>Điểm theo từng bài</h2></div><span className="section-index">03 / 03</span></div>{topicScores.map(({ topic, score: topicScore, total }) => <div className="score-row" key={topic}><span className="score-label"><i style={{ backgroundColor: topicMeta[topic].color }} />{topicMeta[topic].label}</span><div className="score-bar"><span style={{ width: `${(topicScore / total) * 100}%`, backgroundColor: topicMeta[topic].color }} /></div><strong>{topicScore}/{total}</strong></div>)}</div></div></div>
}

function ReviewScreen({ quiz, onBack }: { quiz: QuizState; onBack: () => void }) {
  const wrong = quiz.items.filter((item) => quiz.answers[item.id] !== item.answer)
  return <div className="review-page"><div className="review-header"><button className="text-button" onClick={onBack}>← Kết quả</button><div><p className="eyebrow">Đối chiếu đáp án</p><h1>{wrong.length ? `${wrong.length} câu cần xem lại` : 'Tuyệt vời, không có câu sai'}</h1></div></div><div className="review-list">{quiz.items.map((item, index) => { const selected = quiz.answers[item.id]; const correct = selected === item.answer; return <article className={`review-card ${correct ? 'review-correct' : 'review-wrong'}`} key={item.id}><div className="review-card-top"><span>Câu {String(index + 1).padStart(2, '0')}</span><strong>{correct ? 'Đúng' : 'Chưa đúng'}</strong></div><h2>{item.title}</h2><p><b>Đáp án đúng:</b> {item.options[item.answer]}</p>{selected !== undefined && !correct && <p><b>Bạn đã chọn:</b> {item.options[selected]}</p>}<small>{item.explanation} · {item.source}</small></article> })}</div></div>
}

export default App
