# Copyright 2025 Federico Arce. All Rights Reserved.
# Confidential - Do Not Distribute Without Permission.

import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def send_email(to_email: str, subject: str, body: str, from_email: str = "info@sphere-connect.org"):
    """
    Send an email using Gmail SMTP for SphereConnect notifications.
    Args:
        to_email: Recipient's email address.
        subject: Email subject line.
        body: Email body content.
        from_email: Sender address (default: info@sphere-connect.org).
    """
    # Create message
    msg = MIMEMultipart()
    msg["From"] = from_email
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "plain"))

    # Gmail SMTP configuration
    smtp_server = "smtp.gmail.com"
    smtp_port = 587  # Use 465 for SSL, 587 for TLS
    smtp_user = os.getenv("GMAIL_ADDRESS", "sphereconnect.org@gmail.com")
    smtp_password = os.getenv("GMAIL_APP_PASSWORD")

    try:
        # Connect to Gmail SMTP
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()  # Enable TLS
            server.login(smtp_user, smtp_password)
            server.send_message(msg)
        print(f"Email sent to {to_email}")
    except Exception as e:
        print(f"Failed to send email: {e}")
        raise
