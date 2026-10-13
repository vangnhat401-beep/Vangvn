# Bảng điểm cộng trừ — website thực tế

Website tối hiện đại để công khai bảng điểm: mọi người có đường link đều xem và tìm kiếm được; chỉ người biết mật khẩu quản trị mới cộng/trừ điểm, thêm/sửa/xóa học sinh. Điểm được lưu trong SQLite trên máy chủ, không chỉ ở trình duyệt.

## Chạy thử trên máy tính
Cần Node.js 20+.
1. Giải nén ZIP.
2. Mở terminal tại thư mục này.
3. Thiết lập biến môi trường:
   - `ADMIN_PASSWORD`: mật khẩu quản trị mạnh, tối thiểu 12 ký tự.
   - `SESSION_SECRET`: chuỗi ngẫu nhiên tối thiểu 32 ký tự.
   - `DATA_DIR`: thư mục lưu cơ sở dữ liệu (mặc định `./data`).
4. Chạy `npm install`, sau đó `npm start`, mở `http://localhost:3000`.

Ví dụ macOS/Linux:
```sh
export ADMIN_PASSWORD='dung-mat-khau-rieng-that-manh'
export SESSION_SECRET='thay-bang-chuoi-ngau-nhien-dai-hon-32-ky-tu'
npm install
npm start
```
Windows PowerShell:
```powershell
$env:ADMIN_PASSWORD="dung-mat-khau-rieng-that-manh"
$env:SESSION_SECRET="thay-bang-chuoi-ngau-nhien-dai-hon-32-ky-tu"
npm install
npm start
```

## Đưa lên mạng (Render)
1. Đẩy toàn bộ nội dung thư mục lên một GitHub repository riêng.
2. Tạo tài khoản Render, chọn **New → Blueprint**, kết nối repository và chọn `render.yaml`.
3. Trong phần Environment, đặt `ADMIN_PASSWORD` thành mật khẩu quản trị riêng. `SESSION_SECRET` được tạo tự động. Không gửi mật khẩu cho người xem.
4. Deploy. Render sẽ cấp một URL HTTPS; gửi URL này cho cả lớp để mọi người xem.
5. **Quan trọng:** cấu hình `render.yaml` dùng gói có Persistent Disk (`starter`) để dữ liệu SQLite không mất khi deploy lại. Nếu đổi gói hosting, phải bảo đảm có ổ đĩa bền vững gắn tại `/var/data`, nếu không dữ liệu có thể mất khi khởi động lại.

## Quyền truy cập
- Không cần tài khoản để xem bảng điểm.
- Nút +/− và thêm/sửa/xóa chỉ xuất hiện sau khi đăng nhập quản trị.
- Mật khẩu được giữ ở biến môi trường máy chủ, không nhúng vào mã frontend.
- Cookie phiên dùng `HttpOnly`, `SameSite=Strict`, HTTPS secure ở production; giới hạn thử đăng nhập.
- Chỉ chia sẻ URL công khai, không chia sẻ mật khẩu quản trị.
- Hãy sao lưu định kỳ file `points.db` trong thư mục dữ liệu.

## Dữ liệu mẫu
Lần chạy đầu tự tạo Nguyễn Văn A (1 điểm) và Nguyễn Văn B (-10 điểm). Có thể xóa hai dòng mẫu và thêm danh sách thật sau khi triển khai.
