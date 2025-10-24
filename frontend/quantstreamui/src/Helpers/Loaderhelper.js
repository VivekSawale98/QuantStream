import Swal from "sweetalert2";

const Showloader = (titletext, subtext) => {
  Swal.fire({
    title: titletext,
    text: subtext,
    icon: "info",
    allowOutsideClick: false, // Prevent closing by clicking outside
    allowEscapeKey: false, // Prevent closing by pressing Escape key
    didOpen: () => {
      // Show the loading spinner
      Swal.showLoading();
    },
    customClass: {
      popup: "swal-toast-custom",
    },
  });
};

const Showdefaultloader = () => {
  Swal.fire({
    title: "Loading...",
    text: "Please wait...",
    icon: "info",
    allowOutsideClick: false, // Prevent closing by clicking outside
    allowEscapeKey: false, // Prevent closing by pressing Escape key
    didOpen: () => {
      // Show the loading spinner
      Swal.showLoading();
    },
    customClass: {
      popup: "swal-toast-custom",
    },
  });
};

const Closealert = () => {
  Swal.close();
};

const ShowSuccessAlert = (submessage, title = "Success!", timer = 3000) => {
  Swal.fire({
    title: title,
    text: submessage,
    icon: "success",
    showConfirmButton: false, // Hide the confirm button
    timer: timer, // Close the alert after 3 seconds (3000 ms)
    timerProgressBar: true, // Show a progress bar indicating time remaining
    allowOutsideClick: false, // Prevent closing by clicking outside
    allowEscapeKey: false, // Prevent closing by pressing Escape key
    customClass: {
      popup: "swal-toast-custom",
    },
  });
};

const ShowwarningAlert = (title, subtext) => {
  Swal.fire({
    icon: "warning", // Set the alert type to warning
    title: title,
    text: subtext,
    showConfirmButton: false, // Disable confirm button
    allowOutsideClick: false, // Prevent closing by clicking outside
    allowEscapeKey: false, // Prevent closing by pressing Escape key
    customClass: {
      popup: "swal-toast-custom",
    },
  });
};

const ShowerrorAlert = (title, subtext) => {
  Swal.fire({
    icon: "error", // Set the alert type to error
    title: title,
    text: subtext,
    showConfirmButton: true, // Show confirm button so the alert can be closed
    customClass: {
      popup: "swal-toast-custom",
    },
  });
};

export {
  Showloader,
  Showdefaultloader,
  Closealert,
  ShowSuccessAlert,
  ShowwarningAlert,
  ShowerrorAlert,
};
