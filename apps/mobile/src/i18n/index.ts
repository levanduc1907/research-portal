import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  en: {
    translation: {
      appName: "ChaosNote",
      notes: "Notes",
      fitness: "Fitness",
      profile: "Profile",
      searchPlaceholder: "Search notes...",
      newNote: "New Note",
      saving: "Saving...",
      saved: "Saved",
      titlePlaceholder: "Title",
      contentPlaceholder: "Start typing note content...",
      signInWithGoogle: "Sign in with Google",
      demoLogin: "1-Click Demo Login",
      signOut: "Sign Out",
      pinned: "Pinned",
      allNotes: "All Notes",
      trash: "Trash",
      caloriesBurned: "Calories Burned",
      waterIntake: "Water Intake",
      dailySteps: "Daily Steps",
      workoutTime: "Workout Time",
      systemStatus: "System Status",
    },
  },
  vi: {
    translation: {
      appName: "ChaosNote",
      notes: "Ghi chú",
      fitness: "Sức khỏe",
      profile: "Tài khoản",
      searchPlaceholder: "Tìm kiếm ghi chú...",
      newNote: "Tạo ghi chú",
      saving: "Đang lưu...",
      saved: "Đã lưu",
      titlePlaceholder: "Tiêu đề",
      contentPlaceholder: "Nhập nội dung ghi chú...",
      signInWithGoogle: "Đăng nhập với Google",
      demoLogin: "Đăng nhập thử nghiệm",
      signOut: "Đăng xuất",
      pinned: "Đã ghim",
      allNotes: "Tất cả ghi chú",
      trash: "Thùng rác",
      caloriesBurned: "Calories tiêu thụ",
      waterIntake: "Lượng nước uống",
      dailySteps: "Số bước chân",
      workoutTime: "Thời gian tập luyện",
      systemStatus: "Trạng thái hệ thống",
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: "vi",
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
