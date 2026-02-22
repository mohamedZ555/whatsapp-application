# FadaaWhats Clone - Complete Project Blueprint

## APP_NAME: "FadaaWhats"

## Tech Stack (New)
- **Framework**: Next.js 14+ (App Router, TypeScript)
- **UI**: shadcn/ui + Tailwind CSS
- **Database**: PostgreSQL + Prisma ORM
- **Images**: Cloudinary
- **Auth**: NextAuth.js
- **Payments**: Stripe (primary) + Manual payments
- **Real-time**: Pusher
- **AI**: OpenAI API
- **Email**: Nodemailer (Brevo SMTP)
- **WhatsApp**: Facebook Cloud API v22.0

---

## Environment Variables

```env
APP_NAME="FadaaWhats"
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Database (PostgreSQL)
DATABASE_URL="postgresql://user:password@localhost:5432/fadaa_whats?schema=public"

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<generate-secret>

# Stripe
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

# Pusher (Real-time)
PUSHER_APP_ID=
PUSHER_APP_KEY=
PUSHER_APP_SECRET=
PUSHER_APP_CLUSTER=

# Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Mail (Brevo SMTP)
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=nerdwarecompany@gmail.com
SMTP_PASSWORD=xsmtpsib-8a68aae719367c708b544abf994f957f085f48b12cdedf501ad875cfbca9a4eb-Om8A2EXQRnYPrhFK
SMTP_FROM_ADDRESS=info@trafco.com
SMTP_FROM_NAME="FadaaWhats"

# OpenAI
OPENAI_API_KEY=
OPENAI_ORGANIZATION_ID=

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Facebook OAuth
FACEBOOK_CLIENT_ID=
FACEBOOK_CLIENT_SECRET=
```

---

# PHASE 1: PROJECT SETUP

## Task 1.1 - Initialize Project ✅ COMPLETED
```bash
npx create-next-app@latest fadaa-whats --typescript --tailwind --eslint --app --src-dir
npx shadcn-ui@latest init
npx prisma init --datasource-provider postgresql
```
- Project initialized with Next.js 16.1.6
- Prisma initialized with PostgreSQL
- Folder structure created with src/ directory

## Task 1.2 - Install Dependencies ✅ COMPLETED
```bash
npm install @prisma/client next-auth @auth/prisma-adapter
npm install stripe pusher pusher-js cloudinary nodemailer
npm install zod react-hook-form @hookform/resolvers
npm install zustand axios date-fns lucide-react
npm install xlsx react-pdf qrcode libphonenumber-js openai
npm install node-cron
npm install -D @types/nodemailer @types/node-cron
```

## Task 1.3 - Folder Structure ✅ COMPLETED
```
src/
├── app/
│   ├── (auth)/login, register, forgot-password, reset-password
│   ├── (landing)/page, contact, terms, page/[slug]
│   ├── (dashboard)/dashboard, contacts, chat, campaigns, templates,
│   │                bot-replies, message-log, users, subscription, settings
│   ├── (admin)/admin/dashboard, vendors, subscriptions, plans, pages,
│   │           translations, configuration
│   └── api/auth, webhooks, whatsapp, contacts, campaigns, chat,
│           bot-replies, subscriptions, upload, pusher, v1/[vendorUid]
├── components/ui, layout, chat, campaign, bot, contacts, shared
├── lib/prisma, auth, stripe, pusher, cloudinary, mail, openai,
│       whatsapp/api+webhook+media, validators, utils, constants, permissions
├── hooks/use-pusher, use-chat, use-vendor
├── stores/chat-store
├── types/index, whatsapp, prisma
├── middleware.ts
└── prisma/schema.prisma, seed.ts
```

---

# PHASE 2: DATABASE SCHEMA (Prisma)

## Task 2.1 - Complete Prisma Schema ✅ COMPLETED

### Table: users
```
id             String   PK, cuid
uid            String   unique, cuid
username       String   unique
firstName      String
lastName       String
email          String   unique
emailVerifiedAt DateTime?
password       String   (hashed)
rememberToken  String?
status         Int      default:1 (1=Active, 2=Inactive, 5=Deleted, 6=Blocked)
mobileNumber   String?
timezone       String   default:"UTC"
countryId      Int?     FK -> countries
roleId         Int      FK -> user_roles (1=SuperAdmin, 2=Vendor, 3=VendorUser)
vendorId       String?  FK -> vendors
createdAt      DateTime
updatedAt      DateTime
```
**Relations**: role, vendor, country, vendorUserDetail, loginLogs, assignedContacts, accounts, sessions

### Table: user_roles
```
id        Int    PK, autoincrement
title     String (SuperAdmin, Vendor, VendorUser)
status    Int    default:1
createdAt DateTime
updatedAt DateTime
```

### Table: login_logs
```
id        Int    PK, autoincrement
userId    String FK -> users
ipAddress String?
userAgent String?
createdAt DateTime
```

### Table: accounts (NextAuth OAuth)
```
id                String PK
userId            String FK -> users
type              String
provider          String
providerAccountId String
refresh_token     Text?
access_token      Text?
expires_at        Int?
token_type        String?
scope             String?
id_token          Text?
session_state     String?
```
**Unique**: [provider, providerAccountId]

### Table: sessions (NextAuth)
```
id           String   PK
sessionToken String   unique
userId       String   FK -> users
expires      DateTime
```

### Table: vendors
```
id               String    PK, cuid
uid              String    unique, cuid
title            String?
slug             String?   unique
status           Int       default:1
stripeCustomerId String?
trialEndsAt      DateTime?
createdAt        DateTime
updatedAt        DateTime
```
**Relations**: users, vendorUsers, vendorSettings, contacts, contactGroups, labels, contactCustomFields, campaigns, campaignGroups, botReplies, botFlows, messageLogs, messageQueues, templates, subscriptions, manualSubscriptions, activityLogs

### Table: vendor_users
```
id          String PK, cuid
uid         String unique, cuid
userId      String unique, FK -> users
vendorId    String FK -> vendors
permissions Json?  (array of permission strings)
createdAt   DateTime
updatedAt   DateTime
```

### Table: vendor_settings
```
id           String PK, cuid
vendorId     String FK -> vendors
settingKey   String
settingValue Text?
createdAt    DateTime
updatedAt    DateTime
```
**Unique**: [vendorId, settingKey]

**Setting Keys stored per vendor**:
- `logo_name`, `favicon_name`, `name`, `vendor_slug`
- `contact_email`, `contact_phone`, `address`, `city`, `state`, `country`
- `default_language`, `timezone`
- `enable_bot_timing_restrictions`, `bot_start_timing`, `bot_end_timing`, `bot_timing_timezone`
- `default_enable_flowise_ai_bot_for_users`, `flowise_url`, `flowise_access_token`
- `open_ai_access_key`, `open_ai_organization_id`, `open_ai_model_key`, `open_ai_bot_name`, `open_ai_embedded_training_data`
- `facebook_app_id`, `facebook_app_secret`
- `whatsapp_access_token`, `whatsapp_business_account_id`
- `whatsapp_phone_numbers` (JSON), `current_phone_number_id`, `current_phone_number_number`
- `webhook_verified_at`, `webhook_messages_field_verified_at`, `embedded_setup_done_at`
- `enable_vendor_webhook`, `vendor_webhook_endpoint`
- `is_disabled_message_sound_notification`

### Table: contacts
```
id                  String    PK, cuid
uid                 String    unique, cuid
vendorId            String    FK -> vendors
firstName           String?
lastName            String?
email               String?
waId                String    (WhatsApp ID = phone in international format like 966501234567)
phoneNumber         String?
countryId           Int?      FK -> countries
assignedUserId      String?   FK -> users
messagedAt          DateTime?
unreadMessagesCount Int       default:0
disableAiBot        Boolean   default:false
data                Json?     { contact_notes: string, contact_metadata: {} }
status              Int       default:1
createdAt           DateTime
updatedAt           DateTime
```
**Unique**: [vendorId, waId]
**Indexes**: [vendorId, status], [messagedAt DESC]
**Relations**: vendor, country, assignedUser, groups, labels, customFieldValues, messageLogs, messageQueues

### Table: contact_groups
```
id          String PK, cuid
uid         String unique, cuid
vendorId    String FK -> vendors
name        String
description String?
color       String? default:"#6c757d"
status      Int     default:1 (1=Active, 5=Archived)
createdAt   DateTime
updatedAt   DateTime
```

### Table: group_contacts (pivot)
```
id             String PK, cuid
contactId      String FK -> contacts
contactGroupId String FK -> contact_groups
createdAt      DateTime
```
**Unique**: [contactId, contactGroupId]

### Table: labels
```
id        String PK, cuid
uid       String unique, cuid
vendorId  String FK -> vendors
name      String
color     String? default:"#6c757d"
status    Int     default:1
createdAt DateTime
updatedAt DateTime
```

### Table: contact_labels (pivot)
```
id        String PK, cuid
contactId String FK -> contacts
labelId   String FK -> labels
createdAt DateTime
```
**Unique**: [contactId, labelId]

### Table: contact_custom_fields
```
id          String  PK, cuid
uid         String  unique, cuid
vendorId    String  FK -> vendors
fieldName   String
fieldType   String  (text, number, email, url, date, time, datetime-local)
fieldLabel  String
isRequired  Boolean default:false
placeholder String?
status      Int     default:1
order       Int     default:0
createdAt   DateTime
updatedAt   DateTime
```

### Table: contact_custom_field_values
```
id            String PK, cuid
contactId     String FK -> contacts
customFieldId String FK -> contact_custom_fields
fieldValue    Text?
createdAt     DateTime
updatedAt     DateTime
```
**Unique**: [contactId, customFieldId]

### Table: whatsapp_templates
```
id             String PK, cuid
uid            String unique, cuid
vendorId       String FK -> vendors
templateName   String
templateStatus String (APPROVED, PENDING, REJECTED)
languageCode   String
category       String (MARKETING, UTILITY, AUTHENTICATION)
data           Json?  (full template definition from WhatsApp API including header, body, footer, buttons)
createdAt      DateTime
updatedAt      DateTime
```

### Table: whatsapp_message_logs
```
id                String    PK, cuid
uid               String    unique, cuid
vendorId          String    FK -> vendors
campaignId        String?   FK -> campaigns
contactId         String    FK -> contacts
messageContent    Text?
messageType       String    (text, template, media, interactive, location, contacts)
status            String    default:"sent" (sent, delivered, read, failed, received)
isIncomingMessage Boolean   default:false
timestamp         DateTime?
messagedAt        DateTime?
wabPhoneNumberId  String?   (vendor's phone number ID that sent/received)
waMessageId       String?   (WhatsApp message ID - wamid.xxx)
data              Json?     see structure below
createdAt         DateTime
updatedAt         DateTime
```
**Indexes**: [contactId, vendorId], [campaignId], [status, messagedAt DESC], [waMessageId]

**data JSON structure**:
```json
{
  "contact_data": {},
  "initial_response": {},
  "media_values": {
    "type": "image|video|document|audio|sticker",
    "link": "url",
    "caption": "text",
    "mime_type": "image/jpeg",
    "filename": "file.pdf"
  },
  "template_proforma": {},
  "template_components": [],
  "template_component_values": [],
  "webhook_responses": {
    "failed": {},
    "incoming": {}
  },
  "interaction_message_data": {},
  "options": {}
}
```

### Table: whatsapp_message_queue
```
id             String    PK, cuid
uid            String    unique, cuid
vendorId       String    FK -> vendors
campaignId     String?   FK -> campaigns
contactId      String    FK -> contacts
messageContent Text?
messageType    String
status         Int       default:1 (1=InQueue, 2=Failed, 3=Processing, 4=Processed)
scheduledAt    DateTime?
retries        Int       default:0
maxRetries     Int       default:3
data           Json?     { process_response: { error_message }, contact_data, campaign_data }
createdAt      DateTime
updatedAt      DateTime
```
**Indexes**: [status, scheduledAt]

### Table: campaigns
```
id          String    PK, cuid
uid         String    unique, cuid
vendorId    String    FK -> vendors
name        String
templateId  String?   FK -> whatsapp_templates
scheduledAt DateTime?
status      Int       default:1 (1=Upcoming, 2=Processing, 3=Executed, 5=Cancelled)
data        Json?     see structure below
createdAt   DateTime
updatedAt   DateTime
```
**Indexes**: [vendorId, status]

**data JSON structure**:
```json
{
  "total_contacts": 150,
  "is_all_contacts": false,
  "is_for_template_language_only": true,
  "selected_groups": ["group_id_1", "group_id_2"],
  "template_component_values": {}
}
```

### Table: campaign_groups
```
id          String PK, cuid
uid         String unique, cuid
vendorId    String FK -> vendors
name        String
description String?
createdAt   DateTime
updatedAt   DateTime
```

### Table: bot_replies
```
id             String  PK, cuid
uid            String  unique, cuid
vendorId       String  FK -> vendors
botFlowId      String? FK -> bot_flows
replyName      String
triggerType    String  (see trigger types below)
triggerSubject Text?   (keyword/phrase to match)
replyMessage   Text?
replyType      String  default:"text" (text, template, media, interactive)
status         Int     default:1
order          Int     default:0
data           Json?   { interaction_message, media_message }
createdAt      DateTime
updatedAt      DateTime
```

**Trigger Types**:
- `welcome` - First message from new contact
- `is` - Exact match with triggerSubject
- `starts_with` - Message starts with triggerSubject
- `ends_with` - Message ends with triggerSubject
- `contains_word` - Message contains exact word
- `contains` - Message contains substring
- `stop_promotional` - Opt-out keyword
- `start_promotional` - Opt-in keyword
- `start_ai_bot` - Enable AI bot for this contact
- `stop_ai_bot` - Disable AI bot for this contact

**Reply Message Variables** (replaced dynamically):
- `{first_name}`, `{last_name}`, `{phone_number}`, `{email}`
- `{country}`, `{language_code}`
- `{custom_field_name}` - Any custom field

### Table: bot_flows
```
id          String PK, cuid
uid         String unique, cuid
vendorId    String FK -> vendors
flowName    String
description String?
status      Int    default:1
data        Json?  { flow_builder_data: { nodes, edges, ... } }
createdAt   DateTime
updatedAt   DateTime
```

### Table: subscriptions
```
id          String    PK, cuid
vendorId    String    FK -> vendors
planId      String    (free, plan_1, plan_2, plan_3)
stripeSubId String?   (Stripe subscription ID)
stripePlan  String?   (Stripe price ID)
quantity    Int       default:1
trialEndsAt DateTime?
startsAt    DateTime?
endsAt      DateTime?
status      String    default:"active" (active, cancelled, pending, initiated)
createdAt   DateTime
updatedAt   DateTime
```

### Table: manual_subscriptions
```
id                 String    PK, cuid
uid                String    unique, cuid
vendorId           String    FK -> vendors
subscriptionPlan   String    (plan_1, plan_2, plan_3)
subscriptionMethod String    default:"manual"
billingCycle       String    (monthly, yearly)
status             String    default:"pending" (active, cancelled, pending)
amount             Float
currency           String    default:"USD"
endsAt             DateTime?
data               Json?     { prepared_plan_details, manual_txn_details, txn_data }
createdAt          DateTime
updatedAt          DateTime
```

### Table: configurations
```
id          Int    PK, autoincrement
configKey   String unique
configValue Text?
dataType    Int    default:1 (1=string, 2=bool, 3=int, 4=json, 6=float)
createdAt   DateTime
updatedAt   DateTime
```

**Config Keys** (system-wide settings stored here):
- General: `name`, `logo_image`, `small_logo_image`, `favicon_image`, `description`, `contact_email`
- User: `allow_user_registration`, `activation_required`, `terms_and_conditions_url`
- Currency: `currency`, `currency_symbol`, `currency_format`
- Payment: `enable_stripe`, `stripe_publishable_key`, `stripe_secret_key`, `enable_paypal`, `paypal_client_id`, `enable_razorpay`, `razorpay_key`, `razorpay_secret`, `enable_upi_payment`
- Pusher: `pusher_app_id`, `pusher_key`, `pusher_secret`, `pusher_cluster`
- Social: `enable_google_login`, `google_client_id`, `google_client_secret`, `enable_facebook_login`, `facebook_client_id`, `facebook_client_secret`
- SMTP: `smtp_host`, `smtp_port`, `smtp_username`, `smtp_password`, `smtp_encryption`, `smtp_from_address`, `smtp_from_name`
- Misc: `message_processing_limit_per_batch`, `contact_import_limit`, `message_random_delay_before`, `message_random_delay_after`

### Table: pages
```
id         String  PK, cuid
uid        String  unique, cuid
title      String
slug       String  unique
content    Text?
type       Int     default:1
showInMenu Boolean default:false
status     Int     default:1
createdAt  DateTime
updatedAt  DateTime
```

### Table: activity_logs
```
id         Int      PK, autoincrement
vendorId   String?  FK -> vendors
userId     String?
action     String   (create, update, delete)
moduleName String   (Contacts, Campaigns, BotReplies, etc.)
recordId   String?
activity   Json?    { message: string, data: {} }
ipAddress  String?
userAgent  String?
createdAt  DateTime
```

### Table: countries
```
id           Int    PK, autoincrement
name         String
iso2         String unique
iso3         String?
phoneCode    String?
currencyCode String?
createdAt    DateTime
```

### Table: api_tokens
```
id        String    PK, cuid
vendorId  String    FK -> vendors
token     String    unique
name      String?
expiresAt DateTime?
status    Int       default:1
createdAt DateTime
updatedAt DateTime
```

---

# PHASE 3: AUTHENTICATION

## Task 3.1 - NextAuth Configuration ✅ COMPLETED
**File**: `src/lib/auth.ts`

**Logic**:
- Credentials provider: validate email/username + bcrypt password against `users` table
- Google OAuth provider: link/create user on callback
- Facebook OAuth provider: link/create user on callback
- JWT strategy with custom claims: `{ userId, roleId, vendorId, permissions }`
- Session callback: attach role, vendorId, permissions to session

**Auth Flow**:
1. User submits login form with email/username + password
2. NextAuth credentials provider queries `users` table
3. Check user status (must be Active=1)
4. Verify password with bcrypt
5. Return user with roleId and vendorId
6. JWT callback stores roleId, vendorId in token
7. Session callback exposes roleId, vendorId to client

## Task 3.2 - Registration Flow
**Route**: `POST /api/auth/register`

**Logic**:
1. Validate: firstName, lastName, email (unique), username (unique), password, mobileNumber
2. Hash password with bcrypt
3. Create Vendor record (status=1)
4. Create User record (roleId=2, vendorId=new vendor)
5. Create default Subscription (planId="free", status="active")
6. Send verification email with token
7. Redirect to login

## Task 3.3 - Password Reset
**Logic**:
1. POST `/api/auth/forgot-password`: Generate token, store in DB, send email with reset link
2. GET `/reset-password/[token]`: Verify token, show reset form
3. POST `/api/auth/reset-password`: Validate token, update password, delete token

## Task 3.4 - Middleware Route Protection
**File**: `src/middleware.ts`

**Logic**:
```
/dashboard/* -> require auth + roleId in [2, 3]
/admin/*     -> require auth + roleId == 1
/login, /register -> redirect to dashboard if already authenticated
```

**Vendor User Permissions Check**:
- If roleId=3 (VendorUser), check `vendorUsers.permissions` JSON
- Permission keys: `manage_contacts`, `manage_campaigns`, `manage_templates`, `manage_bot_replies`, `manage_chat`, `view_message_log`, `manage_users`

---

# PHASE 4: WHATSAPP CLOUD API

## Task 4.1 - WhatsApp API Service
**File**: `src/lib/whatsapp/api.ts`
**Base URL**: `https://graph.facebook.com/v22.0/`

### Send Text Message
```
POST /{phoneNumberId}/messages
Headers: Authorization: Bearer {accessToken}
Body: {
  messaging_product: "whatsapp",
  to: "{recipientPhone}",
  type: "text",
  text: { body: "Hello" }
}
```

### Send Template Message
```
POST /{phoneNumberId}/messages
Body: {
  messaging_product: "whatsapp",
  to: "{recipientPhone}",
  type: "template",
  template: {
    name: "template_name",
    language: { code: "en" },
    components: [
      { type: "header", parameters: [{ type: "image", image: { link: "url" } }] },
      { type: "body", parameters: [{ type: "text", text: "value1" }, ...] },
      { type: "button", sub_type: "url", index: 0, parameters: [{ type: "text", text: "path" }] }
    ]
  }
}
```

### Send Media Message
```
POST /{phoneNumberId}/messages
Body: {
  messaging_product: "whatsapp",
  to: "{recipientPhone}",
  type: "image|video|document|audio|sticker",
  image: { link: "cloudinary_url", caption: "optional caption" }
}
```

### Send Interactive Message (Buttons)
```
POST /{phoneNumberId}/messages
Body: {
  messaging_product: "whatsapp",
  to: "{recipientPhone}",
  type: "interactive",
  interactive: {
    type: "button",
    body: { text: "Choose option" },
    action: {
      buttons: [
        { type: "reply", reply: { id: "btn1", title: "Option 1" } },
        { type: "reply", reply: { id: "btn2", title: "Option 2" } }
      ]
    }
  }
}
```

### Send Interactive Message (List)
```
POST /{phoneNumberId}/messages
Body: {
  messaging_product: "whatsapp",
  to: "{recipientPhone}",
  type: "interactive",
  interactive: {
    type: "list",
    body: { text: "Choose from list" },
    action: {
      button: "View Options",
      sections: [{
        title: "Section 1",
        rows: [{ id: "row1", title: "Item 1", description: "desc" }]
      }]
    }
  }
}
```

### Send Location Message
```
POST /{phoneNumberId}/messages
Body: {
  messaging_product: "whatsapp",
  to: "{recipientPhone}",
  type: "location",
  location: { latitude: 24.7136, longitude: 46.6753, name: "Place", address: "Address" }
}
```

### Upload Media to WhatsApp
```
POST /{phoneNumberId}/media
Headers: Authorization: Bearer {accessToken}, Content-Type: multipart/form-data
Body: FormData { file, messaging_product: "whatsapp" }
Returns: { id: "media_id" }
```

### Download Media from WhatsApp
```
GET /{mediaId}
Headers: Authorization: Bearer {accessToken}
Returns: { url: "download_url" }
Then: GET {download_url} with Authorization header to get binary
```

### Get Templates
```
GET /{businessAccountId}/message_templates
Headers: Authorization: Bearer {accessToken}
Returns: { data: [{ name, status, category, language, components, ... }] }
```

### Create Template
```
POST /{businessAccountId}/message_templates
Body: { name, category, language, components: [...] }
```

### Delete Template
```
DELETE /{businessAccountId}/message_templates?name={templateName}
```

### Get Phone Numbers
```
GET /{businessAccountId}/phone_numbers
Returns: { data: [{ id, display_phone_number, verified_name, ... }] }
```

### Health Status
```
GET /{businessAccountId}?fields=health_status
```

## Task 4.2 - Webhook Handler
**File**: `src/app/api/webhooks/whatsapp/[vendorUid]/route.ts`

### GET (Verification)
```typescript
// WhatsApp sends: hub.mode, hub.verify_token, hub.challenge
// Verify: hub.verify_token === sha1(vendorUid)
// Return: hub.challenge as plain text
```

### POST (Incoming Events)
**Complete webhook processing logic**:

```
1. Parse request body
2. Extract entry[0].changes[0]
3. Determine event type:

IF value.messages exists (INCOMING MESSAGE):
  a. Extract: from (phone), timestamp, message type, message content
  b. Find or create Contact by waId + vendorId
  c. Create WhatsAppMessageLog:
     - status: "received"
     - isIncomingMessage: true
     - messageType: text|image|video|document|audio|location|contacts|interactive|button
     - messageContent: message body text
     - data.media_values: if media, download from WhatsApp, upload to Cloudinary, store URL
     - data.webhook_responses.incoming: raw webhook data
  d. Update Contact: messagedAt=now, unreadMessagesCount++
  e. Broadcast via Pusher: "new-message" event to vendor channel

  f. BOT PROCESSING:
     - Query bot_replies for this vendor, ordered by `order`
     - For each bot reply, check trigger:
       * welcome: if contact has no previous messages
       * is: message === triggerSubject (case-insensitive)
       * starts_with: message.startsWith(triggerSubject)
       * ends_with: message.endsWith(triggerSubject)
       * contains_word: message contains exact word
       * contains: message.includes(triggerSubject)
       * stop_promotional: mark contact opted-out
       * start_promotional: mark contact opted-in
       * start_ai_bot: set contact.disableAiBot = false
       * stop_ai_bot: set contact.disableAiBot = true
     - If match found:
       * Replace variables in replyMessage: {first_name}, {last_name}, etc.
       * Send reply based on replyType (text/media/interactive/template)
       * If botFlowId exists: trigger bot flow execution
     - If NO match and AI bot enabled for contact:
       * Send message to OpenAI Chat Completions API
       * Use vendor's training data as system context
       * Send AI response back to WhatsApp contact

IF value.statuses exists (STATUS UPDATE):
  a. Extract: id (wamid), status (sent/delivered/read/failed), timestamp
  b. Find WhatsAppMessageLog by waMessageId
  c. Update status field
  d. If failed: store error info in data.webhook_responses.failed
  e. Broadcast via Pusher: "message-status" event
```

## Task 4.3 - Campaign Processing
**File**: `src/app/api/cron/campaigns/route.ts`
**Trigger**: Vercel Cron (every minute) or manual call

**Complete campaign processing logic**:

```
1. Find campaigns WHERE scheduledAt <= NOW() AND status = 1 (Upcoming)
2. For each campaign:
   a. Update campaign status to 2 (Processing)
   b. Get vendor's WhatsApp credentials from vendor_settings
   c. Find queue messages WHERE campaignId = campaign.id AND status = 1 (InQueue)
   d. Batch size from config: message_processing_limit_per_batch (default: 50)
   e. For each batch:
      - Update batch status to 3 (Processing)
      - For each message in batch:
        * Get contact data
        * Build message payload (template with component values)
        * Send via WhatsApp API
        * Random delay between messages (configurable: 1-3 seconds)
        * If success:
          - Update queue status to 4 (Processed)
          - Create WhatsAppMessageLog with API response
        * If fail:
          - Increment retries count
          - If retries < maxRetries: keep status 1 for retry
          - If retries >= maxRetries: update status to 2 (Failed)
          - Store error in data.process_response.error_message
   f. When all queue messages processed:
      - Update campaign status to 3 (Executed)
```

## Task 4.4 - WhatsApp Setup Flow
**Settings page**: `src/app/(dashboard)/settings/whatsapp/page.tsx`

**Logic**:
1. Show Facebook Embedded Signup button
2. On success: store facebook credentials + access token in vendor_settings
3. Fetch phone numbers from WABA
4. User selects phone number -> store current_phone_number_id
5. Auto-configure webhook URL: `{APP_URL}/api/webhooks/whatsapp/{vendorUid}`
6. System calls WhatsApp API to register webhook
7. Verify webhook with GET challenge
8. Store verification timestamps
9. Setup business profile
10. Show connection status dashboard

---

# PHASE 5: CORE FEATURES (Vendor Dashboard)

## Task 5.1 - Dashboard
**Page**: `src/app/(dashboard)/dashboard/page.tsx`

**Logic**:
- Query total contacts count for vendor
- Query messages sent/received with date range filter
- Query active campaigns count
- Get current subscription plan and usage percentages
- Recent messages feed (last 10)
- Delivery stats: percentage of sent/delivered/read/failed

**API**: `GET /api/dashboard/stats?startDate=X&endDate=Y`

## Task 5.2 - Contact Management

### Contact List
**Page**: `src/app/(dashboard)/contacts/page.tsx`
**API**: `GET /api/contacts?page=1&limit=25&search=X&groupId=X`

**Logic**: Query contacts WHERE vendorId = current vendor, with pagination, search by name/phone/email, filter by group

### Create Contact
**API**: `POST /api/contacts`
**Logic**:
1. Validate phone number with libphonenumber-js
2. Format to international format (e.g., 966501234567)
3. Check uniqueness: [vendorId, waId]
4. Check plan limit: count contacts vs plan.features.contacts
5. Create contact record
6. Assign to groups if provided
7. Save custom field values if provided

### Import Contacts
**API**: `POST /api/contacts/import`
**Logic**:
1. Parse uploaded CSV/Excel file with xlsx library
2. Map columns: first_name, last_name, phone, email, groups
3. Validate each row (phone format, required fields)
4. Check plan limit for total
5. Bulk create contacts (skip duplicates by waId)
6. Assign to specified groups
7. Return import summary (created, skipped, errors)

### Export Contacts
**API**: `GET /api/contacts/export?format=csv|xlsx`
**Logic**: Query all vendor contacts, format as CSV/Excel, return file download

### Contact Groups
**API**: `GET/POST/PUT/DELETE /api/contacts/groups`
**Logic**: Full CRUD scoped to vendor. Archive/unarchive support. Bulk operations.

### Contact Labels
**API**: `GET/POST/PUT/DELETE /api/contacts/labels`
**Logic**: Full CRUD scoped to vendor. Color picker for label color.

### Custom Fields
**API**: `GET/POST/PUT/DELETE /api/contacts/custom-fields`
**Logic**: Define field schema per vendor. Values stored per contact.

## Task 5.3 - Chat / Conversations
**Page**: `src/app/(dashboard)/chat/[[...contactId]]/page.tsx`

### Contact Sidebar (Left Panel)
**API**: `GET /api/chat/contacts?search=X`
**Logic**:
1. Query contacts ordered by messagedAt DESC (most recent first)
2. Include last message preview
3. Include unread count badge
4. Search by name/phone
5. Filter by labels or assigned user

### Chat Window (Right Panel)
**API**: `GET /api/chat/messages/{contactId}?cursor=X`
**Logic**:
1. Paginate messages (cursor-based, load older on scroll up)
2. Mark messages as read (reset unreadMessagesCount to 0)
3. Show message bubbles: sent (right, blue) / received (left, gray)
4. Show status checkmarks: single (sent), double (delivered), blue double (read)
5. Show media inline (images, videos) or as download link (documents)
6. Show interactive message responses

### Send Message
**API**: `POST /api/chat/send`
**Logic**:
1. Validate message content
2. Check subscription is active
3. Call WhatsApp API to send message
4. Create WhatsAppMessageLog record
5. Update contact.messagedAt
6. Broadcast via Pusher to update other tabs/users

### Send Media
**API**: `POST /api/chat/send-media`
**Logic**:
1. Upload file to Cloudinary
2. Call WhatsApp API with Cloudinary URL
3. Create message log with media_values in data JSON

### Real-time Updates
**Client-side**:
```typescript
// Subscribe to Pusher channel
const channel = pusher.subscribe(`private-vendor-${vendorUid}`);
channel.bind('new-message', (data) => {
  // Add message to chat window if viewing this contact
  // Update contact list sidebar (reorder, update preview, increment unread)
  // Play notification sound if enabled
});
channel.bind('message-status', (data) => {
  // Update checkmarks on message bubbles
});
```

### Additional Chat Features
- Assign chat to team member: `POST /api/chat/assign-user`
- Update contact notes: `POST /api/chat/update-notes`
- Assign/remove labels: `POST /api/chat/assign-labels`
- Clear chat history: `POST /api/chat/clear-history/{contactId}`

## Task 5.4 - Campaign Management

### Campaign List
**Page**: `src/app/(dashboard)/campaigns/page.tsx`
**API**: `GET /api/campaigns?status=upcoming|processing|executed|archived`

### Create Campaign
**Page**: `src/app/(dashboard)/campaigns/new/page.tsx`
**API**: `POST /api/campaigns`

**Step-by-step form logic**:
1. **Step 1 - Select Template**: Show approved templates, user picks one
2. **Step 2 - Fill Parameters**: For each template component variable, show input:
   - Header image/video/document: file upload to Cloudinary
   - Body variables `{{1}}`, `{{2}}`: text inputs
3. **Step 3 - Select Recipients**:
   - Option A: All contacts
   - Option B: Select specific contact groups
   - Checkbox: "Only contacts matching template language"
   - Checkbox: "Only opted-in contacts" (for MARKETING category)
4. **Step 4 - Schedule**:
   - Send now: scheduledAt = now
   - Schedule: pick date/time
5. **Submit**:
   a. Check plan limit (campaigns per month)
   b. Create Campaign record
   c. Resolve target contacts (from groups or all)
   d. Create WhatsAppMessageQueue entry for each contact
   e. If "send now": trigger processing immediately

### Campaign Status View
**Page**: `src/app/(dashboard)/campaigns/[id]/page.tsx`
**Logic**:
- Show campaign details and template used
- Queue tab: list of queued messages with status
- Executed tab: list of sent messages with delivery status
- Stats: total, sent, delivered, read, failed counts with progress bar
- Re-queue failed messages button
- Export report as PDF/Excel

## Task 5.5 - Template Management

### Template List
**Page**: `src/app/(dashboard)/templates/page.tsx`
**API**: `GET /api/whatsapp/templates`

### Sync Templates
**API**: `POST /api/whatsapp/templates/sync`
**Logic**:
1. Call WhatsApp API: GET `/{businessAccountId}/message_templates`
2. Compare with local DB records
3. Insert new templates
4. Update changed templates (status, components)
5. Delete removed templates from local DB

### Create Template
**Page**: `src/app/(dashboard)/templates/create/page.tsx`
**API**: `POST /api/whatsapp/templates/create`
**Logic**:
1. Build template payload:
   - name (lowercase, underscores only)
   - category: MARKETING | UTILITY | AUTHENTICATION
   - language: en, ar, etc.
   - components array:
     * HEADER: TEXT, IMAGE, VIDEO, DOCUMENT (with example)
     * BODY: text with {{1}}, {{2}} variables (with examples)
     * FOOTER: plain text
     * BUTTONS: URL, PHONE_NUMBER, QUICK_REPLY, COPY_CODE
2. Submit to WhatsApp API
3. Store in local DB with status "PENDING"
4. WhatsApp reviews and approves/rejects

### Delete Template
**API**: `DELETE /api/whatsapp/templates/{uid}`
**Logic**: Call WhatsApp API to delete, then remove from local DB

## Task 5.6 - Bot Replies

### Bot Reply List
**Page**: `src/app/(dashboard)/bot-replies/page.tsx`
**API**: `GET /api/bot-replies`

### Create Bot Reply
**API**: `POST /api/bot-replies`
**Logic**:
1. Check plan limit
2. Validate trigger type and subject
3. If replyType = "media": upload file to Cloudinary, store in data.media_message
4. If replyType = "interactive": build button/list JSON in data.interaction_message
5. Create BotReply record

### Bot Reply Execution (inside webhook handler)
**Logic** (detailed):
```
function processBotReplies(vendorId, contact, incomingMessage):
  botReplies = query bot_replies WHERE vendorId AND status=1 ORDER BY order ASC

  for each reply in botReplies:
    matched = false

    switch reply.triggerType:
      case "welcome":
        // Check if this is contact's first message
        messageCount = count message_logs WHERE contactId AND isIncoming
        matched = (messageCount <= 1)

      case "is":
        matched = (incomingMessage.toLowerCase() === reply.triggerSubject.toLowerCase())

      case "starts_with":
        matched = incomingMessage.toLowerCase().startsWith(reply.triggerSubject.toLowerCase())

      case "ends_with":
        matched = incomingMessage.toLowerCase().endsWith(reply.triggerSubject.toLowerCase())

      case "contains_word":
        words = incomingMessage.toLowerCase().split(/\s+/)
        matched = words.includes(reply.triggerSubject.toLowerCase())

      case "contains":
        matched = incomingMessage.toLowerCase().includes(reply.triggerSubject.toLowerCase())

      case "stop_promotional":
        matched = (incomingMessage.toLowerCase() === reply.triggerSubject.toLowerCase())
        if matched: mark contact as opted-out

      case "start_promotional":
        matched = (incomingMessage.toLowerCase() === reply.triggerSubject.toLowerCase())
        if matched: mark contact as opted-in

      case "start_ai_bot":
        matched = (incomingMessage.toLowerCase() === reply.triggerSubject.toLowerCase())
        if matched: update contact SET disableAiBot = false

      case "stop_ai_bot":
        matched = (incomingMessage.toLowerCase() === reply.triggerSubject.toLowerCase())
        if matched: update contact SET disableAiBot = true

    if matched:
      // Replace variables in reply message
      message = reply.replyMessage
        .replace(/{first_name}/g, contact.firstName)
        .replace(/{last_name}/g, contact.lastName)
        .replace(/{phone_number}/g, contact.waId)
        .replace(/{email}/g, contact.email)
        ...and custom fields

      // Send reply based on type
      switch reply.replyType:
        case "text": sendTextMessage(phoneNumberId, token, contact.waId, message)
        case "media": sendMediaMessage(phoneNumberId, token, contact.waId, reply.data.media_message)
        case "interactive": sendInteractiveMessage(phoneNumberId, token, contact.waId, reply.data.interaction_message)
        case "template": sendTemplateMessage(...)

      // If has bot flow, trigger flow
      if reply.botFlowId:
        executeBotFlow(reply.botFlowId, contact)

      return // Stop after first match (break)

  // No bot match - try AI
  if !contact.disableAiBot:
    processAiReply(vendorId, contact, incomingMessage)
```

## Task 5.7 - Bot Flows (Visual Builder)

### Flow Builder
**Page**: `src/app/(dashboard)/bot-replies/bot-flows/[id]/builder/page.tsx`
**Library**: React Flow (reactflow npm package)

**Node Types**:
1. **Start Node**: Entry point
2. **Message Node**: Send a text/media/interactive message
3. **Condition Node**: Branch based on user's response
4. **Delay Node**: Wait X seconds before next action
5. **Action Node**: Assign label, assign user, toggle AI bot

**Logic**:
- Flow data stored as JSON in botFlows.data.flow_builder_data
- Structure: `{ nodes: [...], edges: [...] }`
- On save: `POST /api/bot-flows/{id}/update`
- On trigger from bot reply: traverse flow graph starting from Start node

### Flow Execution
```
function executeBotFlow(flowId, contact):
  flow = query bot_flows WHERE id = flowId
  nodes = flow.data.flow_builder_data.nodes
  edges = flow.data.flow_builder_data.edges

  currentNode = find node WHERE type = "start"

  while currentNode:
    switch currentNode.type:
      case "message":
        send message to contact via WhatsApp API
        wait for user response

      case "condition":
        check user's last response against condition rules
        select appropriate outgoing edge

      case "delay":
        wait specified time

      case "action":
        perform action (assign label, etc.)

    // Follow edge to next node
    nextEdge = find edge WHERE source = currentNode.id
    if nextEdge: currentNode = find node WHERE id = nextEdge.target
    else: break
```

## Task 5.8 - Message Log
**Page**: `src/app/(dashboard)/message-log/page.tsx`
**API**: `GET /api/message-log?startDate=X&endDate=Y&isIncoming=true|false&status=X`

**Logic**:
- DataTable with all vendor messages
- Filters: date range, incoming/outgoing, status
- Click row to see full message details (including webhook responses, media, errors)
- Export as CSV

## Task 5.9 - Team Members
**Page**: `src/app/(dashboard)/users/page.tsx`
**API**: `GET/POST/PUT/DELETE /api/users`

**Logic**:
1. Check plan limit for teamMembers
2. Create user: roleId=3 (VendorUser), vendorId=current vendor
3. Create VendorUser record with permissions JSON
4. Permission keys: manage_contacts, manage_campaigns, manage_templates, manage_bot_replies, manage_chat, view_message_log, manage_users

## Task 5.10 - Vendor Settings
**Page**: `src/app/(dashboard)/settings/page.tsx`

**Sub-pages**:
- `/settings` - General: business name, email, phone, address, timezone
- `/settings/whatsapp` - WhatsApp setup flow (Task 4.4)
- `/settings/profile` - Current user profile update

**API**: `GET/POST /api/settings`
**Logic**: Read/write vendor_settings table by settingKey

---

# PHASE 6: SUBSCRIPTION & BILLING

## Task 6.1 - Plan Configuration
**File**: `src/lib/constants.ts`

```typescript
export const PLANS = {
  free: {
    id: 'free', title: 'Free', enabled: true,
    features: {
      contacts: 2,          // max contacts
      campaignsPerMonth: 10, // campaigns per billing cycle
      botReplies: 10,        // max bot reply rules
      botFlows: 5,           // max bot flows
      contactCustomFields: 2,// max custom fields
      teamMembers: 0,        // 0 = no team members
      aiChatBot: true,       // true = feature enabled
      apiAccess: true,       // true = API enabled
    },
    pricing: { monthly: 0, yearly: 0 },
    trialDays: 0,
    stripePriceIds: { monthly: null, yearly: null },
  },
  plan_1: {
    id: 'plan_1', title: 'Standard', enabled: true,
    features: {
      contacts: 500, campaignsPerMonth: 50, botReplies: 50,
      botFlows: 20, contactCustomFields: 10, teamMembers: 5,
      aiChatBot: true, apiAccess: true,
    },
    pricing: { monthly: 10, yearly: 100 },
    trialDays: 14,
    stripePriceIds: { monthly: 'price_xxx', yearly: 'price_yyy' },
  },
  plan_2: {
    id: 'plan_2', title: 'Premium', enabled: true,
    features: {
      contacts: 5000, campaignsPerMonth: 200, botReplies: 200,
      botFlows: 50, contactCustomFields: 25, teamMembers: 10,
      aiChatBot: true, apiAccess: true,
    },
    pricing: { monthly: 20, yearly: 199 },
    trialDays: 14,
    stripePriceIds: { monthly: 'price_xxx', yearly: 'price_yyy' },
  },
  plan_3: {
    id: 'plan_3', title: 'Ultimate', enabled: true,
    features: {
      contacts: -1,           // -1 = unlimited
      campaignsPerMonth: -1,
      botReplies: -1,
      botFlows: -1,
      contactCustomFields: -1,
      teamMembers: -1,
      aiChatBot: true,
      apiAccess: true,
    },
    pricing: { monthly: 30, yearly: 299 },
    trialDays: 14,
    stripePriceIds: { monthly: 'price_xxx', yearly: 'price_yyy' },
  },
};
```

## Task 6.2 - Limit Enforcement
**File**: `src/lib/permissions.ts`

```typescript
async function checkLimit(vendorId, featureKey):
  subscription = query active subscription for vendorId
  plan = PLANS[subscription.planId]
  limit = plan.features[featureKey]

  if limit === -1: return true // unlimited

  currentCount = count records based on featureKey:
    contacts -> count contacts WHERE vendorId
    campaignsPerMonth -> count campaigns WHERE vendorId AND createdAt in current billing cycle
    botReplies -> count bot_replies WHERE vendorId
    botFlows -> count bot_flows WHERE vendorId
    contactCustomFields -> count contact_custom_fields WHERE vendorId
    teamMembers -> count vendor_users WHERE vendorId

  return currentCount < limit
```

## Task 6.3 - Stripe Integration

### Subscription Page
**Page**: `src/app/(dashboard)/subscription/page.tsx`

**Logic**:
- Show current plan with usage stats
- Show available plans with pricing
- Upgrade/Downgrade button -> Stripe Checkout
- Cancel subscription
- Resume cancelled subscription
- View invoices
- Billing portal link

### Stripe Checkout
**API**: `POST /api/subscriptions/create`
**Logic**:
1. Create or get Stripe customer for vendor
2. Create Stripe Checkout Session with plan's stripePriceId
3. Return session URL for redirect
4. On success: Stripe webhook handles subscription creation

### Stripe Webhook
**API**: `POST /api/webhooks/stripe`
**Events handled**:
- `checkout.session.completed`: Create Subscription record
- `customer.subscription.updated`: Update plan/status
- `customer.subscription.deleted`: Mark as cancelled
- `invoice.payment_succeeded`: Record successful payment
- `invoice.payment_failed`: Notify vendor, mark at-risk

### Manual Subscriptions (Admin)
**Logic**:
- Admin creates ManualSubscription with plan, billing cycle, amount
- Vendor sees pending payment with bank details/UPI QR
- Vendor uploads payment proof
- Admin approves -> ManualSubscription status = active, creates Subscription record
- Admin rejects -> notify vendor

---

# PHASE 7: ADMIN PANEL

## Task 7.1 - Admin Dashboard
**Page**: `src/app/(admin)/admin/page.tsx`
- Total vendors count
- Active subscriptions count and revenue
- Total messages sent across platform
- Recent vendor registrations
- System health

## Task 7.2 - Vendor Management
**Page**: `src/app/(admin)/admin/vendors/page.tsx`
**APIs**: `GET/POST/PUT/DELETE /api/admin/vendors`

**Features**:
- List vendors with search/pagination
- Add vendor (create user + vendor + free subscription)
- View vendor details with their dashboard stats
- Edit vendor info
- Delete vendor (cascade: users, contacts, messages, etc.)
- Login as vendor (impersonation): set a session flag, redirect to /dashboard
- Change vendor password

## Task 7.3 - Subscription Management
**Page**: `src/app/(admin)/admin/subscriptions/page.tsx`
- View all subscriptions across vendors
- Filter by status, plan
- Manual subscription CRUD
- Cancel vendor subscription

## Task 7.4 - Configuration
**Page**: `src/app/(admin)/admin/configuration/[pageType]/page.tsx`
**API**: `GET/POST /api/admin/configuration`

**Settings pages**:
- `general`: App name, logos (Cloudinary upload), favicon, description
- `user`: Registration toggle, email activation, terms URL
- `payment`: Stripe keys, PayPal toggle, Razorpay keys, manual payment toggle
- `currency`: Default currency, symbol, format
- `smtp`: Mail server settings
- `social`: Google/Facebook OAuth credentials
- `pusher`: Pusher credentials
- `misc`: Message batch size, contact import limit, message delays

## Task 7.5 - Page Management (CMS)
**Page**: `src/app/(admin)/admin/pages/page.tsx`
**API**: `GET/POST/PUT/DELETE /api/admin/pages`

- CRUD for static pages
- Rich text editor (use a React editor like TipTap or Quill)
- Auto-slug generation from title
- Toggle show in navigation menu

## Task 7.6 - Translation Management
**Page**: `src/app/(admin)/admin/translations/page.tsx`
- Language CRUD (name, code, direction RTL/LTR)
- Key-value translation editor
- Import/export JSON translation files
- Auto-translate via OpenAI API

---

# PHASE 8: EXTERNAL API

## Task 8.1 - API Token System
**Settings page** section: Generate API token for vendor
**Logic**: Generate crypto random token, store in api_tokens table with vendorId

## Task 8.2 - API Endpoints
**Base**: `/api/v1/[vendorUid]/`
**Auth**: `Authorization: Bearer {api_token}` header

### Middleware: Validate token
```
1. Extract Bearer token from Authorization header
2. Query api_tokens WHERE token AND status=1 AND (expiresAt IS NULL OR expiresAt > NOW())
3. Get vendorId from token record
4. Verify vendorUid matches vendor
5. Check plan has apiAccess enabled
6. Proceed or return 401
```

### POST /contact/send-message
```json
Request: { "phone_number": "+966501234567", "message": "Hello" }
Logic: Find/create contact by phone, send text message, return message ID
Response: { "success": true, "message_id": "xxx" }
```

### POST /contact/send-media-message
```json
Request: { "phone_number": "+966501234567", "media_type": "image", "media_url": "https://...", "caption": "Check this" }
Logic: Send media message via WhatsApp API
```

### POST /contact/send-template-message
```json
Request: { "phone_number": "+966501234567", "template_name": "hello_world", "language": "en", "components": [...] }
Logic: Send template message
```

### POST /contact/create
```json
Request: { "phone_number": "+966501234567", "first_name": "John", "last_name": "Doe", "email": "john@example.com", "groups": ["group_uid"] }
Logic: Validate phone, check plan limit, create contact, assign groups
```

### POST /contact/update/{phoneNumber}
```json
Request: { "first_name": "Jane", "email": "jane@example.com" }
Logic: Find contact by phone + vendorId, update fields
```

---

# PHASE 9: REAL-TIME & NOTIFICATIONS

## Task 9.1 - Pusher Setup

### Server (trigger events)
**File**: `src/lib/pusher.ts`
```typescript
import Pusher from 'pusher';
const pusher = new Pusher({ appId, key, secret, cluster });

// Trigger event
pusher.trigger(`private-vendor-${vendorUid}`, 'new-message', { messageData });
pusher.trigger(`private-vendor-${vendorUid}`, 'message-status', { messageId, status });
```

### Client (subscribe to events)
**Hook**: `src/hooks/use-pusher.ts`
```typescript
import PusherClient from 'pusher-js';
// Subscribe to private-vendor-{vendorUid}
// Bind to: new-message, message-status, contact-update
```

### Auth endpoint
**API**: `POST /api/pusher/auth`
**Logic**: Verify user is authenticated and belongs to the requested vendor channel

## Task 9.2 - Notifications
- Sound notification on new message (configurable toggle in vendor settings)
- Browser notification API (request permission, show notification)
- Sidebar badge: unread messages count (query unread across all contacts)
- Email notifications for: subscription expiry (7 days before), payment failure

---

# PHASE 10: MEDIA & FILES (Cloudinary)

## Task 10.1 - Cloudinary Integration
**File**: `src/lib/cloudinary.ts`

**Upload function**:
```typescript
async function uploadToCloudinary(file, folder):
  // folder: "logos", "chat-media", "templates", "imports"
  // Returns: { publicId, secureUrl, format, width, height }
```

**Used for**:
1. App logos & favicons (admin configuration)
2. Chat media messages (images, videos, documents)
3. Template header media (images for template headers)
4. Contact import files (temporary, delete after processing)
5. Payment proof uploads
6. Business profile photo

## Task 10.2 - Import/Export

### Contact Import
**Logic**:
1. User uploads CSV/Excel file
2. Parse with xlsx library
3. Show column mapping UI (map file columns to contact fields)
4. Validate each row (phone format, required fields)
5. Batch create contacts (upsert by waId)
6. Return summary: created, updated, skipped, errors

### Contact Export
**Logic**: Query all contacts with groups and custom fields, generate CSV/Excel, return as download

### Campaign Report
**Logic**: Query campaign + message logs, compute stats, generate PDF with dompdf equivalent or Excel

---

# PHASE 11: AI BOT (OpenAI)

## Task 11.1 - AI Configuration
**Settings**: Vendor configures in `/settings`:
- OpenAI API key
- Organization ID (optional)
- Model: gpt-3.5-turbo, gpt-4, etc.
- Bot name / persona
- Training data (text input or file upload)

**Storage**: All stored in vendor_settings table

## Task 11.2 - AI Reply Logic
**File**: `src/lib/openai.ts`

```
function processAiReply(vendorId, contact, incomingMessage):
  // 1. Get vendor's OpenAI settings
  settings = getVendorSettings(vendorId)
  apiKey = settings.open_ai_access_key
  model = settings.open_ai_model_key || "gpt-3.5-turbo"
  botName = settings.open_ai_bot_name || "AI Assistant"
  trainingData = settings.open_ai_embedded_training_data

  // 2. Build conversation context
  recentMessages = query last 10 messages for this contact

  messages = [
    { role: "system", content: `You are ${botName}. ${trainingData}` },
    ...recentMessages.map(m => ({
      role: m.isIncomingMessage ? "user" : "assistant",
      content: m.messageContent
    })),
    { role: "user", content: incomingMessage }
  ]

  // 3. Call OpenAI Chat Completions
  response = await openai.chat.completions.create({
    model: model,
    messages: messages,
  })

  aiReply = response.choices[0].message.content

  // 4. Send AI reply via WhatsApp
  sendTextMessage(phoneNumberId, accessToken, contact.waId, aiReply)

  // 5. Log the outgoing message
  create WhatsAppMessageLog for the AI reply
```

---

# PHASE 12: LANDING PAGE

## Task 12.1 - Public Pages
**Page**: `src/app/(landing)/page.tsx`

**Sections**:
1. Hero: App name, tagline, CTA buttons (Get Started, Login)
2. Features: WhatsApp messaging, campaigns, bot automation, AI chat, team collaboration
3. Pricing: Display plans from PLANS constant
4. Contact form: name, email, message -> send email via Nodemailer
5. Footer: Links to terms, privacy, contact

**Dynamic pages**: `src/app/(landing)/page/[slug]/page.tsx`
- Query `pages` table by slug
- Render content (HTML from rich text editor)

---

# PHASE 13: TESTING & DEPLOYMENT

## Task 13.1 - Testing Checklist
1. Auth: Register, login, social login, password reset, email verification
2. WhatsApp: Connect account, verify webhook, send/receive messages
3. Contacts: CRUD, import, export, groups, labels, custom fields
4. Chat: Send text, send media, receive (webhook), real-time via Pusher
5. Campaigns: Create, schedule, process queue, delivery tracking
6. Bot: Create trigger, test matching, verify auto-reply, test flow execution
7. Templates: Sync, create, use in campaign, use in chat
8. Subscriptions: Upgrade via Stripe, verify limits, admin manual subscription
9. Admin: Vendor management, configuration, pages, impersonation
10. API: Generate token, send message, create contact
11. Real-time: Multi-tab/multi-user Pusher updates
12. AI: Configure OpenAI, test auto-reply, test conversation context

## Task 13.2 - Deployment
- **Hosting**: Vercel (Next.js optimized)
- **Database**: Neon PostgreSQL (serverless, Prisma compatible)
- **Cron**: Vercel Cron Jobs for campaign processing (vercel.json config)
- **Environment**: Set all env vars in Vercel dashboard
- **Webhook URLs**: Update WhatsApp and Stripe webhook URLs to production domain
- **Cloudinary**: Production Cloudinary account with proper upload presets
- **Domain**: Configure custom domain in Vercel

---

# KEY LOGIC FLOWS (How Everything Connects)

## Flow 1: Vendor Onboarding
```
Register -> Create User (role=2) + Vendor -> Assign Free Plan
-> Login -> Dashboard -> Settings -> Connect WhatsApp (Embedded Signup)
-> Configure Webhook -> Select Phone Number -> Ready to use
```

## Flow 2: Sending a Chat Message
```
User types message -> POST /api/chat/send
-> Validate subscription active -> Call WhatsApp Cloud API POST /{phoneNumberId}/messages
-> Store in whatsapp_message_logs (status: sent) -> Broadcast via Pusher "new-message"
-> WhatsApp webhook receives status update (delivered/read/failed)
-> Update message_log status -> Broadcast via Pusher "message-status"
-> UI updates checkmarks in real-time
```

## Flow 3: Receiving a Message
```
WhatsApp sends POST to /api/webhooks/whatsapp/{vendorUid}
-> Parse message -> Find/create Contact by phone number
-> Store in whatsapp_message_logs (status: received, isIncoming: true)
-> Update contact (messagedAt, unreadMessagesCount++)
-> Broadcast via Pusher "new-message" -> UI shows message in chat
-> Process bot replies (check triggers) -> If match: send auto-reply
-> If no match + AI enabled: send to OpenAI -> send AI reply
```

## Flow 4: Campaign Bulk Send
```
Create Campaign -> Select template + fill params + select groups + schedule time
-> Generate whatsapp_message_queue entries (1 per contact, status: InQueue)
-> Cron runs every minute -> Find campaigns where scheduledAt <= now
-> Batch process: take N messages from queue -> status: Processing
-> For each: call WhatsApp API -> on success: status=Processed, create message_log
-> On fail: increment retries, if < max keep InQueue, else status=Failed
-> When all processed: campaign status = Executed
-> Track delivery via webhooks updating message_logs
```

## Flow 5: Bot Reply Matching
```
Incoming message received in webhook
-> Query bot_replies WHERE vendorId, status=1, ORDER BY order
-> For each reply: test triggerType against message text
-> First match wins (break after match)
-> Replace variables ({first_name}, etc.) in reply message
-> Send reply via WhatsApp API based on replyType
-> If reply has botFlowId: execute bot flow
-> If NO match: check if contact has AI bot enabled
-> If AI enabled: forward to OpenAI, return AI response
```

## Flow 6: Subscription Upgrade
```
Vendor visits /subscription -> Clicks upgrade on plan
-> POST /api/subscriptions/create -> Create Stripe Checkout Session
-> Redirect to Stripe -> Payment processed
-> Stripe webhook: checkout.session.completed
-> Create/update Subscription record (planId, status: active)
-> Vendor now has higher plan limits
-> All limit checks use new plan features
```

## Flow 7: Admin Impersonation
```
Admin visits /admin/vendors -> Clicks "Login as" on vendor
-> POST /api/admin/vendors/{id}/impersonate
-> Store original admin session, create vendor session
-> Redirect to /dashboard (vendor's view)
-> Show "Return to Admin" banner
-> Click return: restore admin session, redirect to /admin
```

---

# DATABASE RELATIONSHIPS DIAGRAM

```
Vendor (1) ───┬──→ (N) Users
              ├──→ (N) VendorUsers (team members with permissions)
              ├──→ (N) VendorSettings (key-value config)
              ├──→ (N) Contacts
              ├──→ (N) ContactGroups
              ├──→ (N) Labels
              ├──→ (N) ContactCustomFields
              ├──→ (N) Campaigns
              ├──→ (N) CampaignGroups
              ├──→ (N) WhatsAppTemplates
              ├──→ (N) BotReplies
              ├──→ (N) BotFlows
              ├──→ (N) Subscriptions
              ├──→ (N) ManualSubscriptions
              ├──→ (N) WhatsAppMessageLogs
              ├──→ (N) WhatsAppMessageQueues
              └──→ (N) ActivityLogs

Contact (1) ──┬──→ (N) GroupContacts ←── (N) ContactGroup
              ├──→ (N) ContactLabels ←── (N) Label
              ├──→ (N) ContactCustomFieldValues ←── (N) ContactCustomField
              ├──→ (N) WhatsAppMessageLogs
              └──→ (N) WhatsAppMessageQueues

Campaign (1) ─┬──→ (N) WhatsAppMessageLogs
              ├──→ (N) WhatsAppMessageQueues
              └──→ (1) WhatsAppTemplate

BotReply (N) ──→ (1) BotFlow
User (1) ──→ (N) Contacts (assigned)
User (1) ──→ (1) VendorUser
User (N) ──→ (1) UserRole
```

---

# SUPPORTED CURRENCIES (from original)

**Zero-decimal**: BIF, CLP, DJF, GNF, JPY, KMF, KRW, MGA, PYG, RWF, VND, VUV, XAF, XOF, XPF, HUF, TWD

**All supported**: AUD, CAD, EUR, GBP, USD, NZD, CHF, HKD, SGD, SEK, DKK, PLN, NOK, HUF, CZK, ILS, MXN, BRL, MYR, PHP, TWD, THB, TRY, INR, NGN

---

# STATUS CODES (from original)

```
1  = Active / Brand New
2  = Inactive / Deactivated
3  = Suspended / Processing
4  = On Hold
5  = Completed / Deleted / Soft-Deleted / Archived
6  = Blocked
7  = Reported
8  = Old/Rejected
9  = Verification Required
10 = Flagged
```
