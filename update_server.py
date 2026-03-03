import re

with open("server/src/controllers/order.controller.ts", "r", encoding="utf-8") as f:
    content = f.text if hasattr(f, "text") else f.read()

# Make sure we import emailService
if "email.service.js" not in content:
    content = re.sub(
        r"(import orderService from '../services/order.service.js';)",
        r"\1\nimport emailService from '../services/email.service.js';\nimport ClientModel from '../models/client.model.js';",
        content,
    )

if "const { status, note, sendEmail, customEmailMessage, downloadLink } = req.body;" not in content:
    content = re.sub(
        r"const { status, note } = req.body;",
        r"const { status, note, sendEmail, customEmailMessage, downloadLink } = req.body;",
        content
    )

if "if (sendEmail && customEmailMessage)" not in content:
    content = re.sub(
        r"return res.status\(200\).json\(\{\r?\n\s*message: 'Order status updated successfully',\r?\n\s*data: order,\r?\n\s*\}\);",
        r"""
        if (sendEmail && customEmailMessage) {
            try {
                // Determine client logic to grab emails:
                const clientObj = order.clientId || await ClientModel.findById(order.clientId);
                if (clientObj?.email) {
                    await emailService.sendOrderStatusEmail({
                        to: clientObj.email,
                        clientName: clientObj.name || '',
                        orderName: order.orderName || '',
                        status: order.status,
                        message: customEmailMessage
                    });
                }
            } catch (e) {
                console.error("Failed to send status email", e);
                // Do not throw, order updated already
            }
        }

        return res.status(200).json({
            message: 'Order status updated successfully',
            data: order,
        });""",
        content
    )

with open("server/src/controllers/order.controller.ts", "w", encoding="utf-8") as f:
    f.write(content)

print("Updated server controller.")
