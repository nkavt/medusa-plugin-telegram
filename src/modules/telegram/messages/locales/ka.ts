import type { MessageStrings } from "../types"

// Written for the seller's point of view; order numbers use "№" as in Georgian business documents.
const strings: MessageStrings = {
  "customer_created": "ახალი მომხმარებელი დარეგისტრირდა",
  "order_placed": "ახალი შეკვეთა №{{id}}",
  "order_canceled": "შეკვეთა №{{id}} გაუქმდა",
  "order_completed": "შეკვეთა №{{id}} დასრულდა",
  "order_fulfillment_created": "შეკვეთა №{{id}} მომზადდა გასაგზავნად",
  "order_return_requested": "შეკვეთა №{{id}}: მოთხოვნილია დაბრუნება",
  "order_return_received": "შეკვეთა №{{id}}: დაბრუნებული ნივთები მიღებულია",
  "customer": "მომხმარებელი",
  "email": "ელ. ფოსტა",
  "phone": "ტელეფონი",
  "total": "ჯამური თანხა",
  "guest": "სახელი არ არის მითითებული",
  "open_in_admin": "ნახვა ადმინ პანელში",
  "test_message": "ეს სატესტო შეტყობინებაა თქვენი Medusa მაღაზიიდან. Telegram-თან კავშირი გამართულად მუშაობს!"
}

export default strings
