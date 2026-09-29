import { Heading } from './components/catalyst/heading'
import { Text } from './components/catalyst/text'
import { Footer } from './components/Footer'
import { Header } from './components/Header'
import { SupportForm } from './components/SupportForm'

export default function SupportPage() {
  return (
    <div className="flex min-h-full flex-col">
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
        <Heading>Support</Heading>
        <Text className="mt-2">Questions, bugs or ideas about Pyrgus Web or the Pyrgus app? Send us a message.</Text>
        <SupportForm />
      </main>
      <Footer />
    </div>
  )
}
