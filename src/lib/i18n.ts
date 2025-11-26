import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      // Auth
      'welcome': 'Welcome to LifeLink Asia',
      'signin': 'Sign In',
      'signup': 'Sign Up',
      'signout': 'Sign Out',
      'email': 'Email',
      'password': 'Password',
      'fullname': 'Full Name',
      'role': 'Role',
      
      // Roles
      'role_victim': 'I Need Help (Victim)',
      'role_rescuer': 'I Can Help (Rescuer)',
      'role_admin': 'Administrator',
      
      // SOS
      'sos_emergency': 'EMERGENCY',
      'sos_send': 'SEND SOS SIGNAL',
      'sos_type': 'Emergency Type',
      'sos_location': 'Your Location',
      'sos_accuracy': 'GPS Accuracy',
      'sos_people': 'How many people?',
      'sos_description': 'Describe the situation',
      'sos_photo': 'Add Photo (Optional)',
      'sos_severity': 'Severity Level',
      'sos_sent': 'Help requested. Rescuers have been notified.',
      
      // Emergency Types
      'flood_trap': 'Trapped by Water',
      'medical_emergency': 'Medical Emergency',
      'food_water': 'Need Food/Water',
      'evacuation': 'Need Evacuation',
      'power_outage': 'Power Outage',
      'structural_collapse': 'Building Collapse',
      'fire': 'Fire',
      'other': 'Other Emergency',
      
      // Map
      'map_title': 'Rescue Operations Center',
      'map_active_sos': 'Active SOS Signals',
      'map_rescuers': 'Active Rescuers',
      'map_shelters': 'Shelters',
      'map_assign': 'Assign to Me',
      'map_navigate': 'Navigate',
      
      // Common
      'loading': 'Loading...',
      'error': 'Error',
      'success': 'Success',
      'cancel': 'Cancel',
      'confirm': 'Confirm',
      'close': 'Close',
    },
  },
  th: {
    translation: {
      'welcome': 'ยินดีต้อนรับสู่ ไลฟ์ลิงก์ เอเชีย',
      'signin': 'เข้าสู่ระบบ',
      'signup': 'สมัครสมาชิก',
      'signout': 'ออกจากระบบ',
      'email': 'อีเมล',
      'password': 'รหัสผ่าน',
      'fullname': 'ชื่อ-นามสกุล',
      'role': 'บทบาท',
      
      'role_victim': 'ฉันต้องการความช่วยเหลือ',
      'role_rescuer': 'ฉันสามารถช่วยเหลือได้',
      'role_admin': 'ผู้ดูแลระบบ',
      
      'sos_emergency': 'ฉุกเฉิน',
      'sos_send': 'ส่งสัญญาณขอความช่วยเหลือ',
      'sos_type': 'ประเภทเหตุฉุกเฉิน',
      'sos_location': 'ตำแหน่งของคุณ',
      'sos_accuracy': 'ความแม่นยำ GPS',
      'sos_people': 'มีกี่คน?',
      'sos_description': 'อธิบายสถานการณ์',
      'sos_photo': 'เพิ่มรูปภาพ (ถ้ามี)',
      'sos_severity': 'ระดับความรุนแรง',
      'sos_sent': 'ส่งคำขอความช่วยเหลือแล้ว ทีมกู้ภัยได้รับแจ้งแล้ว',
      
      'flood_trap': 'ติดกับดักน้ำ',
      'medical_emergency': 'ฉุกเฉินทางการแพทย์',
      'food_water': 'ต้องการอาหาร/น้ำ',
      'evacuation': 'ต้องการอพยพ',
      'power_outage': 'ไฟฟ้าดับ',
      'structural_collapse': 'อาคารพัง',
      'fire': 'ไฟไหม้',
      'other': 'เหตุฉุกเฉินอื่นๆ',
      
      'map_title': 'ศูนย์ประสานงานกู้ภัย',
      'map_active_sos': 'สัญญาณ SOS ที่ใช้งานอยู่',
      'map_rescuers': 'ผู้กู้ภัยที่ทำงานอยู่',
      'map_shelters': 'ศูนย์พักพิง',
      'map_assign': 'รับภารกิจนี้',
      'map_navigate': 'นำทาง',
      
      'loading': 'กำลังโหลด...',
      'error': 'เกิดข้อผิดพลาด',
      'success': 'สำเร็จ',
      'cancel': 'ยกเลิก',
      'confirm': 'ยืนยัน',
      'close': 'ปิด',
    },
  },
  vi: {
    translation: {
      'welcome': 'Chào mừng đến LifeLink Asia',
      'signin': 'Đăng nhập',
      'signup': 'Đăng ký',
      'signout': 'Đăng xuất',
      'email': 'Email',
      'password': 'Mật khẩu',
      'fullname': 'Họ và tên',
      'role': 'Vai trò',
      
      'role_victim': 'Tôi cần giúp đỡ',
      'role_rescuer': 'Tôi có thể giúp',
      'role_admin': 'Quản trị viên',
      
      'sos_emergency': 'KHẨN CẤP',
      'sos_send': 'GỬI TÍN HIỆU SOS',
      'sos_type': 'Loại khẩn cấp',
      'sos_location': 'Vị trí của bạn',
      'sos_accuracy': 'Độ chính xác GPS',
      'sos_people': 'Có bao nhiêu người?',
      'sos_description': 'Mô tả tình huống',
      'sos_photo': 'Thêm ảnh (Tùy chọn)',
      'sos_severity': 'Mức độ nghiêm trọng',
      'sos_sent': 'Đã gửi yêu cầu trợ giúp. Đội cứu hộ đã được thông báo.',
      
      'flood_trap': 'Bị mắc kẹt trong nước',
      'medical_emergency': 'Cấp cứu y tế',
      'food_water': 'Cần thức ăn/nước',
      'evacuation': 'Cần sơ tán',
      'power_outage': 'Mất điện',
      'structural_collapse': 'Tòa nhà sập',
      'fire': 'Hỏa hoạn',
      'other': 'Khẩn cấp khác',
      
      'map_title': 'Trung tâm điều phối cứu hộ',
      'map_active_sos': 'Tín hiệu SOS đang hoạt động',
      'map_rescuers': 'Người cứu hộ đang hoạt động',
      'map_shelters': 'Nơi trú ẩn',
      'map_assign': 'Nhận nhiệm vụ này',
      'map_navigate': 'Chỉ đường',
      
      'loading': 'Đang tải...',
      'error': 'Lỗi',
      'success': 'Thành công',
      'cancel': 'Hủy',
      'confirm': 'Xác nhận',
      'close': 'Đóng',
    },
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'th', // Default to Thai
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;