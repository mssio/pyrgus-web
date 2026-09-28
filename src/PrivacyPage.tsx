import { Footer } from './components/Footer'
import { Header } from './components/Header'
import { PrivacyPolicy } from './components/PrivacyPolicy'

export default function PrivacyPage() {
  return (
    <div className="flex min-h-full flex-col">
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
        <PrivacyPolicy />
      </main>
      <Footer />
    </div>
  )
}
