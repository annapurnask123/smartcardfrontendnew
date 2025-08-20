export function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (document.getElementById('razorpay-sdk')) return resolve(true)
    const script = document.createElement('script')
    script.id = 'razorpay-sdk'
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export async function openRazorpayCheckout({ key, amount, currency = 'INR', name, description, orderId, handler }) {
  const loaded = await loadRazorpayScript()
  if (!loaded) throw new Error('Razorpay SDK failed to load')
  const options = {
    key,
    amount,
    currency,
    name,
    description,
    order_id: orderId,
    handler,
    theme: { color: '#0d6efd' },
  }
  const rzp = new window.Razorpay(options)
  rzp.open()
  return rzp
}

