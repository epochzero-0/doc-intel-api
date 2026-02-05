import UploadSection from '../Upload/UploadSection'
import ChatSection from '../Chat/ChatSection'

export default function MainContent() {
  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <UploadSection />

      {/* Chat Section */}
      <ChatSection />
    </div>
  )
}
