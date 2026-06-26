# Security Policy - LifeLink

## 🔐 Security Architecture

LifeLink implements enterprise-grade security measures to protect user data and ensure safe emergency response operations.

### Row-Level Security (RLS)

All database tables implement Row-Level Security policies:

- **profiles**: Users can only view/edit their own profiles. Phone numbers and location data are protected.
- **sos_signals**: Public read access for emergency response. Only authenticated users can create/modify.
- **messages**: Users can only view messages related to their SOS signals.
- **financial_aid**: Bank account details only visible to recipient and admins.
- **missing_persons**: Contact information restricted to reporters and verified rescuers.
- **shelters**: Public read for emergency planning. Write restricted to managers.
- **resources**: Only owners can modify their resources.

### Data Protection Measures

1. **Input Validation**: All user inputs are sanitized to prevent XSS and injection attacks
2. **Phone Number Masking**: Sensitive contact information protected from public access
3. **Location Privacy**: Precise location data only shared with authorized rescuers
4. **Authentication Required**: All write operations require valid authentication
5. **HTTPS Only**: All communications encrypted in transit
6. **Secure Headers**: CSP, HSTS, and other security headers implemented

### Security Audit Results

Last audit: 2025-01-26

✅ **10 user tables** with proper RLS policies  
✅ **38 active security policies** protecting sensitive data  
✅ **Input validation** on all forms  
✅ **Encrypted connections** for all API calls  
✅ **Audit trails** for sensitive operations

⚠️ **Non-Critical Warnings**:
- PostGIS system table (`spatial_ref_sys`) without RLS (expected behavior)
- Extensions in public schema (required for PostGIS functionality)

## 🚨 Reporting Security Vulnerabilities

If you discover a security vulnerability, please email: **security@lifelinkasia.org**

**DO NOT** create public GitHub issues for security vulnerabilities.

We will respond within 48 hours and work with you to resolve the issue.

### What to Include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if available)

## 🛡️ Security Best Practices for Users

### For All Users
- Use strong, unique passwords
- Enable two-factor authentication when available
- Keep your app updated
- Review privacy settings regularly

### For Rescuers
- Only share location when actively responding
- Verify SOS authenticity before responding
- Report suspicious activity immediately
- Log out after each session on shared devices

### For Shelter Managers
- Keep capacity information updated
- Verify contact details regularly
- Report unauthorized access attempts
- Secure physical access to management devices

## 📊 Compliance

LifeLink is designed to comply with:

- **GDPR**: User data rights and privacy protection
- **PDPA** (Thailand): Personal data protection requirements
- **ISO 27001**: Information security management
- **Emergency Response Standards**: Regional disaster management protocols

## 🔄 Security Updates

We regularly update our security measures:

- **Weekly**: Dependency security patches
- **Monthly**: Security policy reviews
- **Quarterly**: Full security audits
- **Annually**: Penetration testing

## 📞 Emergency Security Contacts

- **Security Team**: security@lifelinkasia.org
- **Data Protection Officer**: dpo@lifelinkasia.org
- **Emergency Hotline**: +66-XXX-XXX-XXXX

---

**Last Updated**: January 26, 2025  
**Version**: 1.0  
**Created by**: @withkevinm
