const event_name = $(".event-title").text();
const path = "/timer/" + String(event_name);

$.get(path, function (DATA) {
  const startDate = DATA.startDate;
  const endDate = DATA.endDate;
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const weekdays = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  let ed = new Date(endDate);

  const futureTime = ed.getTime();
  function getRemainingTime() {
    const today = new Date().getTime();

    const t = futureTime - today;
    const oneHour = 60 * 60 * 1000;
    const oneMinute = 60 * 1000;
    let hours = Math.floor(t / oneHour);
    let minutes = Math.floor((t % oneHour) / oneMinute);
    let seconds = Math.floor((t % oneMinute) / 1000);

    // Changing the values in DOM
    const hrs = $(".hours");
    const mins = $(".minutes");
    const secs = $(".seconds");
    const items = [hrs, mins, secs];
    const values = [hours, minutes, seconds];
    function format(item) {
      if (item < 10) {
        return (item = `0${item}`);
      }
      return item;
    }
    items.forEach(function (item, index) {
      // item.innerHTML = format(values[index]);
      item.html(format(values[index]));
    });

    if (t < 0) {
      clearInterval(countdown);
      $(".quiz-form").submit();
    }
  }

  let countdown = setInterval(getRemainingTime, 1000);

  getRemainingTime();
});

// $(window).scroll(function () {
//   var windowPos = $(window).scrollTop();
//   if(windowPos > 100){
//     $(".timer-box").stop().animate({top: "30px"},500);
//   }else{
//     $(".timer-box").stop().animate({top :"200px"},500, "linear");
//   }
//   console.log($(window).scrollTop());
// });
