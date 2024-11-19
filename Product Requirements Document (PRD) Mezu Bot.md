# Product Requirements Document (PRD): Mezu Bot

**Project Summary:**  
Mezu Bot is a Discord bot designed to streamline server experience, focusing on ticket management, payment processing, event management, and social media notifications. The bot is built with `discord.js` for Discord interactions and leverages SupaBase as the backend.

---

## 1. Objectives

- **Ticket System:** Streamline customer and staff interactions.
- **Payment System:** Enable secure payments, tracking, and notifications.
- **Event Management:** Simplify event organization with RSVP capabilities.
- **Social Media Notifications:** Keep server members engaged with automatic updates.

---

## 2. Features and Functional Requirements

### 2.1 Ticket System

**Core Functionality:**
- **Main Embed Display:** The bot shows an embed message with three buttons: `Quote`, `Apply`, and `Support`.
- **Button Actions:**
  - **Quote & Apply:** Initiate a private chat with questions for members, submitted directly to staff.
  - **Support:** Opens a private chat with staff for support inquiries.
- **Quote Submissions:**
  - **Quote Logging:** Sent to a designated channel with claim functionality for staff.
  - **Claim System:** Staff can claim the ticket, adding them to a private chat for further discussion.

**Backend Requirements:**
- **Data Storage:** Store ticket information, responses, and chat logs in SupaBase.
- **Access Control:** Allow access to Managers and above, configurable per ticket type.

### 2.2 Payment System

**Core Functionality:**
- **Client Payments:** Integrate a secure payment gateway (e.g., PayPal).
- **Payment Requests:** Staff can request payments through the bot, specifying the amount and description.
- **Payment Notifications:** Notify clients of payment requests with a secure payment link/button.

**Automated Processes:**
- **Payment Status Tracking:** Log and update payment statuses (e.g., “Deposit Paid”) in SupaBase.
- **Staff Alerts:** Notify relevant staff and builder channels upon payment completion.
- **Refund Requests:** Clients can initiate refund requests, alerting staff for approval.

### 2.3 Event Management

**Core Functionality:**
- **Event Scheduling:** Organize server events, such as competitions or meetings.
- **Event Notifications:** Notify server members about events, including time, date, and description.
- **RSVP System:** Track RSVPs and participation numbers.

**Automated Processes:**
- **Reminder Notifications:** Send reminders as the event date approaches.

### 2.4 Social Media Notifications

**Core Functionality:**
- **Account Integration:** Integrate with Twitter, Instagram, and YouTube.
- **Automatic Announcements:** Notify server channels when a new social media post is made, with a link and description.

---

## 3. Technical Specifications

**Frontend (Discord Bot):**
- Built with `discord.js`.
- Handles user interactions, embeds, and direct messages in Discord.

**Backend (SupaBase):**
- Store and manage ticket, payment, event, and social media data.
- Handle data access permissions for different user roles.

**Payment Processing:**
- Preferred integration with PayPal or other secure payment gateway for payment requests, tracking, and refund handling.

---

## 4. User Roles and Permissions

- **Regular Members:** Access Ticket System for `Quote`, `Apply`, and `Support`. View social media notifications and RSVP to events.
- **Staff (Manager Level and Above):** Access all ticket responses, claim tickets, initiate payment requests, and handle refund approvals.

---

## 5. Success Metrics

- **Efficiency of Ticket Response:** Measure time from ticket submission to staff claim.
- **Payment Tracking Accuracy:** Ensure timely and accurate updates of payment statuses.
- **Event Participation Rates:** Track RSVP numbers and attendance.
- **Engagement with Social Media Notifications:** Measure click-through rates on social mediaror announcements.

---

This PRD provides clear direction for implementing the core functionalities and structure for the Mezu Bot on Discord using SupaBase as the backend. Let us know if further refinements or additional details are needed!
