export type Topic = 'Bài 1' | 'Bài 2' | 'Bài 3' | 'Bài 4' | 'Bài 5' | 'Bài 6' | 'Phụ lục' | 'Đề khó'

export type QuizMode = 'practice' | 'topic' | 'exam'

export type Question = {
  id: number
  topic: Topic
  title: string
  options: string[]
  answer: number
  explanation: string
  source: string
}

export type SessionQuestion = Question & {
  shuffledOptions: string[]
  answer: number
}
