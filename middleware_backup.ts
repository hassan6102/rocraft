import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  // بنشيك لو اللينك بيبدأ بـ /admin
  if (req.nextUrl.pathname.startsWith('/admin')) {
    const authHeader = req.headers.get('authorization');
    
    // بنسحب اليوزر والباسوورد من الملف المخفي
    const adminUser = process.env.ADMIN_USER;
    const adminPass = process.env.ADMIN_PASS;
    
    // بنشفرهم عشان نقارنهم باللي هيدخله المستخدم
    const expectedAuth = `Basic ${btoa(`${adminUser}:${adminPass}`)}`;

    // لو مدخلش الباسوورد أو دخله غلط، بنرفض الدخول ونطلع المربع
    if (authHeader !== expectedAuth) {
      return new NextResponse('Authentication required', {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm="Secure Admin Dashboard"',
        },
      });
    }
  }
  
  // لو كله تمام، بنسمحله يكمل
  return NextResponse.next();
}