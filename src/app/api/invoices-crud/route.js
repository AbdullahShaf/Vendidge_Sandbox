import { db } from '../../../../lib/db';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const body = await req.json();
    const { invoiceNo, userId, customerId, buyerProvince, sellerProvince, sellerProvinceId, scenarioCodeId, saleType, buyerType,fbrInvoiceRefNo, date, items } = body;

    if (!invoiceNo || !userId || !customerId || !date || !buyerProvince || !sellerProvince || !sellerProvinceId || !scenarioCodeId || !buyerType || !saleType || !items) {
      console.log("fields:", invoiceNo, userId, customerId, buyerProvince, sellerProvince, sellerProvinceId, scenarioCodeId, saleType, buyerType, fbrInvoiceRefNo,   date, items);
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }
    console.log("Creating invoice with data:", buyerType, typeof buyerType);
    const [result] = await db.query(
      `INSERT INTO invoices (invoice_no, user_id, invoice_date, customer_id, buyerProvince, sellerProvince, sellerProvinceId, scenario_code,saleType, buyerType,fbrInvoiceRefNo, items)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        invoiceNo,
        userId,
        date,
        customerId,
        buyerProvince,
        sellerProvince,
        sellerProvinceId,
        scenarioCodeId,
        saleType,
        buyerType,
        fbrInvoiceRefNo,
        JSON.stringify(items),
      ]
    );

    return NextResponse.json(
      { message: "Invoice created successfully", invoiceId: result.insertId },
      { status: 201 }
    );
  } catch (error) {
    console.warn("Error creating invoice:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);

    const page = parseInt(searchParams.get('page')) || 1;
    const pageSize = parseInt(searchParams.get('pageSize')) || 10;
    const userId = parseInt(searchParams.get('userId'));
    console.log('userId:', userId);
    if (page < 1 || pageSize < 1) {
      return NextResponse.json(
        { message: 'Invalid pagination parameters' },
        { status: 400 }
      );
    }

    const [rows] = await db.query(
      `CALL get_invoices_by_status_order_paginated(?, ?, ?)`,
      [page, pageSize, userId]
    );

    const invoices = rows[0];
    console.log('count:', invoices.length);
    return NextResponse.json(
      {
        data: invoices,
        page,
        pageSize,
        count: invoices.length
      },
      { status: 200 }
    );

  } catch (error) {
    console.warn('Error fetching invoices:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(req) {
  try {
    const body = await req.json();
    const { invoiceId, invoiceNo, date, customerId, buyerProvince, sellerProvince, sellerProvinceId, scenarioCodeId, saleType, buyerType, fbrInvoiceRefNo,items, status } = body;

    if (!invoiceId) {
      return NextResponse.json({ message: 'invoiceId is required' }, { status: 400 });
    }

    // Build the update depending on provided fields
    const updates = [];
    const params = [];

    if (typeof invoiceNo !== 'undefined') { updates.push('invoice_no = ?'); params.push(invoiceNo); }
    if (typeof date !== 'undefined') { updates.push('invoice_date = ?'); params.push(date); }
    if (typeof customerId !== 'undefined') { updates.push('customer_id = ?'); params.push(customerId); }
    if (typeof buyerProvince !== 'undefined') { updates.push('buyerProvince = ?'); params.push(buyerProvince); }
    if (typeof sellerProvinceId !== 'undefined') { updates.push('sellerProvinceId = ?'); params.push(sellerProvinceId); }
    if (typeof sellerProvince !== 'undefined') { updates.push('sellerProvince = ?'); params.push(sellerProvince); }
    if (typeof scenarioCodeId !== 'undefined') { updates.push('scenario_code = ?'); params.push(scenarioCodeId); }
    if (typeof saleType !== 'undefined') { updates.push('saleType = ?'); params.push(saleType); }
    if (typeof buyerType !== 'undefined') { updates.push('buyerType = ?'); params.push(buyerType); }
    if (typeof fbrInvoiceRefNo !== 'undefined') { updates.push('fbrInvoiceRefNo = ?'); params.push(fbrInvoiceRefNo); }
    if (typeof items !== 'undefined') { updates.push('items = ?'); params.push(JSON.stringify(items)); }
    if (typeof status !== 'undefined') { updates.push('status = ?'); params.push(status); }

    if (updates.length === 0) {
      return NextResponse.json({ message: 'No fields to update' }, { status: 400 });
    }

    const sql = `UPDATE invoices SET ${updates.join(', ')} WHERE id = ?`;
    params.push(invoiceId);

    await db.query(sql, params);

    return NextResponse.json({ message: 'Invoice updated successfully' }, { status: 200 });
  } catch (error) {
    console.warn('Error updating invoice:', error);
    return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
  }
}

// export async function DELETE(req) {
//   try {
//     const { searchParams } = new URL(req.url);
//     const invoiceId = searchParams.get('invoiceId');

//     if (!invoiceId) {
//       return NextResponse.json({ message: 'invoiceId is required' }, { status: 400 });
//     }

//     await db.query(`DELETE FROM invoices WHERE id = ?`, [invoiceId]);

//     return NextResponse.json({ message: 'Invoice deleted successfully' }, { status: 200 });
//   } catch (error) {
//     console.warn('Error deleting invoice:', error);
//     return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
//   }
// }


export async function DELETE(req) {
  const connection = await db.getConnection();

  try {
    const { searchParams } = new URL(req.url);
    const invoiceId = searchParams.get("invoiceId");

    if (!invoiceId) {
      return NextResponse.json(
        { message: "invoiceId is required" },
        { status: 400 }
      );
    }

    await connection.beginTransaction();

    const [rows] = await connection.query(
      `SELECT invoice_no, status, user_id 
       FROM invoices 
       WHERE id = ? 
       FOR UPDATE`,
      [invoiceId]
    );

    if (rows.length === 0) {
      await connection.rollback();
      return NextResponse.json(
        { message: "Invoice not found" },
        { status: 404 }
      );
    }

    const { invoice_no, status, user_id } = rows[0];

    if (status === "Success") {
      await connection.rollback();
      return NextResponse.json(
        { message: "Success invoice cannot be deleted" },
        { status: 403 }
      );
    }

    await connection.query(
      `DELETE FROM invoices WHERE id = ?`,
      [invoiceId]
    );

    await connection.query(
      `UPDATE invoices
       SET invoice_no = invoice_no - 1
       WHERE user_id = ?
         AND invoice_no > ?`,
      [user_id, invoice_no]
    );

    await connection.commit();

    return NextResponse.json(
      { message: "Invoice deleted and invoice numbers rearranged" },
      { status: 200 }
    );
  } catch (error) {
    await connection.rollback();
    console.warn("Error deleting invoice:", error);

    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}


