# Degree Defenders - Fake Degree/Certificate Recognition System

A comprehensive AI-powered platform for detecting and preventing fake degrees and forged academic certificates, built for the Government of Jharkhand's Department of Higher and Technical Education.

## 🎯 Problem Statement
With increasing digitization, fake degrees and forged academic certificates have become a major concern for higher education institutions, employers, and government bodies. This platform provides a robust, AI-powered, blockchain-enabled solution to detect anomalies, verify authenticity, and prevent the use of fraudulent educational credentials.

## 🔑 Key Features

### Certificate Verification Module
- Upload interface for employers, universities, agencies, and government departments
- OCR/AI extraction of key details (Name, Roll/Reg no, Course, Marks, Certificate ID, University)
- Cross-check against institutional records
- Anomaly detection for tampered grades, forged seals, invalid certificate numbers

### Blockchain/Cryptographic Validation
- QR codes and blockchain-based hashes for new certificates
- Instant validation through QR scanning
- Tamper-proof certificate generation

### Legacy Certificate Handling
- Manual database upload by institutions
- OCR + AI anomaly detection for older certificates

### Institution Integration
- ERP integration for universities/colleges
- Real-time verification APIs
- Bulk upload capabilities

### Admin Dashboard
- Role-based access control
- Verification activity monitoring
- Forgery trend analysis and reporting
- Blacklist management

## 🛠 Tech Stack

### Frontend
- **Framework**: Next.js 14 with React 18
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn/ui
- **State Management**: Zustand
- **File Upload**: React Dropzone

### Backend
- **Runtime**: Node.js with Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT + OAuth
- **File Storage**: AWS S3 compatible
- **OCR**: Tesseract.js + Google Vision API
- **Blockchain**: Ethereum/Polygon integration

### DevOps
- **Containerization**: Docker
- **CI/CD**: GitHub Actions
- **Deployment**: AWS/Azure ready

## 👥 User Roles

1. **Verifier** (Employers/Agencies/Govt. bodies)
   - Upload and verify certificates instantly
   
2. **Institution** (Universities/Colleges)
   - Upload or integrate records
   - Issue new blockchain-verified certificates
   
3. **Admin** (Higher Education Department)
   - Monitor system and generate reports
   - Blacklist offenders
   
4. **Students/Public**
   - Self-verify certificates via public portal

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Docker (optional)

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd degree-defenders
```

2. Install dependencies
```bash
# Backend dependencies
npm install

# Frontend dependencies
cd frontend
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
# Fill in your configuration
```

4. Set up the database
```bash
npx prisma migrate dev
npx prisma generate
```

5. Start the development servers
```bash
# Backend (from root)
npm run dev

# Frontend (from frontend directory)
cd frontend
npm run dev
```

## 📁 Project Structure

```
degree-defenders/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   └── utils/
│   ├── prisma/
│   └── tests/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── lib/
│   │   └── styles/
│   └── public/
├── docs/
└── docker/
```

## 🔐 Security Features

- End-to-end encryption of certificate data
- Role-based access control
- JWT token authentication
- Input validation and sanitization
- Rate limiting and DDoS protection
- Audit logging

## 📊 Analytics & Reporting

- Real-time verification statistics
- Forgery detection trends
- Institution performance metrics
- Compliance reporting

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For technical support or questions, please contact:
- Email: support@degreedefenders.gov.in
- Documentation: [Link to detailed docs]
