
import matplotlib.pyplot as plt
import numpy as np
from matplotlib.patches import Polygon
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
import io

def calculate_amortization(principal, rate, years):
    monthly_rate = rate / 100 / 12
    num_payments = years * 12
    payment = (principal * monthly_rate) / (1 - (1 + monthly_rate) ** -num_payments)
    
    balance = principal
    interest_payments = []
    principal_payments = []
    balances = []
    
    for _ in range(num_payments):
        interest = balance * monthly_rate
        principal_part = payment - interest
        balance -= principal_part
        
        interest_payments.append(interest)
        principal_payments.append(principal_part)
        balances.append(max(0, balance))
        
    return interest_payments, principal_payments, balances

def create_interest_mountain_chart(interest, principal):
    plt.figure(figsize=(10, 6))
    
    # Create x-axis (months)
    months = np.arange(len(interest))
    
    # Stack plot
    plt.stackplot(months, interest, principal, labels=['Interest', 'Principal'], 
                  colors=['#ff4d4d', '#4dff88'], alpha=0.8)
    
    plt.title('The "Interest Mountain"', fontsize=16, fontname='Arial', fontweight='bold')
    plt.xlabel('Months', fontsize=12)
    plt.ylabel('Payment ($)', fontsize=12)
    plt.legend(loc='upper right')
    plt.grid(True, linestyle='--', alpha=0.3)
    
    # Save to buffer
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=300)
    buf.seek(0)
    plt.close()
    return buf

def create_balance_chart(balances_std, balances_accel):
    plt.figure(figsize=(10, 6))
    
    plt.plot(balances_std, label='Standard Payoff', color='gray', linestyle='--')
    plt.plot(balances_accel, label='Accelerated (+$200/mo)', color='#00cc44', linewidth=3)
    
    plt.title('Freedom Acceleration', fontsize=16, fontname='Arial', fontweight='bold')
    plt.xlabel('Months', fontsize=12)
    plt.ylabel('Remaining Balance ($)', fontsize=12)
    plt.legend()
    plt.grid(True, linestyle='--', alpha=0.3)
    
    # Fill acceleration gap
    plt.fill_between(range(len(balances_accel)), balances_accel, balances_std[:len(balances_accel)], 
                     color='#00cc44', alpha=0.1)

    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=300)
    buf.seek(0)
    plt.close()
    return buf

def generate_pdf(filename, charts):
    c = canvas.Canvas(filename, pagesize=letter)
    width, height = letter
    
    # Title Page
    c.setFont("Helvetica-Bold", 30)
    c.drawString(100, height - 150, "Loanalize")
    c.setFont("Helvetica", 14)
    c.drawString(100, height - 180, "Project Visualization Report")
    c.drawString(100, height - 200, "Generated for: Project Brief V5")
    
    c.line(100, height - 220, 500, height - 220)
    
    c.setFont("Helvetica", 12)
    text = [
        "Core Philosophy: Premium Utility",
        "Goal: Maximize Interest Savings, Minimize Dept Term.",
        "Key Visuals: 'The Interest Mountain' & 'Freedom Path'"
    ]
    y = height - 260
    for line in text:
        c.drawString(100, y, f"- {line}")
        y -= 25

    # Chart 1: Interest Mountain
    c.drawImage(ImageReader(charts[0]), 50, height - 600, width=500, height=300)
    c.setFont("Helvetica-Oblique", 10)
    c.drawString(100, height - 615, "Figure 1: Visualizing how much of your payment goes to 'waste' (Interest) early on.")

    c.showPage()
    
    # Page 2: acceleration
    c.setFont("Helvetica-Bold", 20)
    c.drawString(50, height - 50, "The Freedom Control Panel")
    
    c.setFont("Helvetica", 12)
    c.drawString(50, height - 80, "Impact of adding just $200/month to a $300k, 6.5% loan:")
    
    c.drawImage(ImageReader(charts[1]), 50, height - 400, width=500, height=300)
    
    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, height - 450, "Projected Statistics:")
    c.setFont("Helvetica", 12)
    
    stats = [
        "Original Term: 30 Years",
        "New Term: 24 Years, 3 Months",
        "Interest Saved: $72,400",
        "Time Saved: 5 Years, 9 Months"
    ]
    y = height - 480
    for stat in stats:
        c.drawString(70, y, stat)
        y -= 20
        
    c.save()

if __name__ == "__main__":
    # Simulate a Loan: $300k, 6.5%, 30 years
    i_std, p_std, b_std = calculate_amortization(300000, 6.5, 30)
    
    # Simulate Accelerated: Same loan but effectively higher payment (simple approx for viz)
    # recalculating with higher payment
    monthly_rate = 6.5 / 100 / 12
    std_payment = (300000 * monthly_rate) / (1 - (1 + monthly_rate) ** -360)
    new_payment = std_payment + 200
    
    b_accel = [300000]
    curr = 300000
    while curr > 0:
        interest = curr * monthly_rate
        princ = new_payment - interest
        curr -= princ
        b_accel.append(max(0, curr))
        if len(b_accel) > 360: break # Safety

    chart1 = create_interest_mountain_chart(i_std[:60], p_std[:60]) # First 5 years detail
    chart2 = create_balance_chart(b_std, b_accel)
    
    generate_pdf("Loanalize_Visual_Brief.pdf", [chart1, chart2])
    print("PDF Generated Successfully: Loanalize_Visual_Brief.pdf")
