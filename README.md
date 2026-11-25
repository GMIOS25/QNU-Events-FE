# QNU-Events Frontend

Cổng thông tin và ứng dụng điểm danh sự kiện trực tuyến Đại học Quy Nhơn (QNU-Events Client).

## Công nghệ sử dụng
- **React 19** + **TypeScript** + **Vite**
- **Tailwind CSS v4**
- **React Router v7**
- **TanStack Query v5**
- **React Hook Form** + **Zod**
- **html5-qrcode** & **qrcode.react**
- **Vitest** & **React Testing Library**

## Hướng dẫn cài đặt & chạy thử
```bash
# 1. Cài đặt dependencies
npm install

# 2. Chạy ứng dụng chế độ phát triển (port 5173, tự động proxy /api sang localhost:8080)
npm run dev

# 3. Kiểm tra mã nguồn & type
npm run lint
npm run typecheck

# 4. Chạy kiểm thử tự động
npm run test

# 5. Đóng gói sản phẩm
npm run build
```

## Tài khoản dùng thử (môi trường dev/demo)
- **Chủ sự kiện:** `owner01` / `Demo@12345`
- **Sinh viên K49:** `sv001` / `Demo@12345`
