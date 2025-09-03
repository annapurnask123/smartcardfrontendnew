// Dynamically load Razorpay SDK
export function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (document.getElementById("razorpay-sdk")) return resolve(true);

    const script = document.createElement("script");
    script.id = "razorpay-sdk";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);

    document.body.appendChild(script);
  });
}

/**
 * Open Razorpay Checkout
 * @param {Object} options
 * @param {string} options.key - Razorpay key
 * @param {number} options.amount - Amount in paise
 * @param {string} [options.currency='INR']
 * @param {string} options.name - Merchant name
 * @param {string} options.description - Description
 * @param {string} options.orderId - Razorpay order_id
 * @param {Object} [options.prefill] - { name, email, contact }
 * @param {function} options.handler - Callback on success
 * @returns {Promise} - Resolves when checkout is opened
 */
export async function openRazorpayCheckout({
  key,
  amount,
  currency = "INR",
  name,
  description,
  orderId,
  prefill = {},
  handler,
  theme = { color: "#0d6efd" },
}) {
  const loaded = await loadRazorpayScript();
  if (!loaded) throw new Error("Razorpay SDK failed to load");

  return new Promise((resolve, reject) => {
    const options = {
      key,
      amount,
      currency,
      name,
      description,
      order_id: orderId,
      prefill,
      theme,
      handler: async (response) => {
        try {
          await handler(response);
          resolve(response);
        } catch (err) {
          reject(err);
        }
      },
      modal: {
        ondismiss: () => reject(new Error("Payment cancelled by user")),
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  });
}
