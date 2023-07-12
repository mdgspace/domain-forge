<script setup type="module">
import TableLite from "vue3-table-lite/ts"; 
const user = localStorage.getItem("LoggedUser");
const table = {
        isLoading: false,
        columns: [
          {
            headerStyles: { background: "#FFC947", color: "#0A1931" },
            columnStyles:{ background: "#0A1931", color: "#FFC947"},
            label: "Date",
            field: "date",
            width: "10%",
            sortable: false,
          },
          {
            headerStyles: { background: "#FFC947", color: "#0A1931" },
            columnStyles:{ background: "#0A1931", color: "#FFC947"},
            label:"ID",
            field: "_id",
            width: "10%",
            sortable: false,
          },
          {
            headerStyles: { background: "#FFC947", color: "#0A1931" },
            columnStyles:{ background: "#0A1931", color: "#FFC947"},
            label: "Subdomain",
            field: "subdomain",
            width: "20%",
            sortable: false,
          },
          {
            headerStyles: { background: "#FFC947", color: "#0A1931" },
            columnStyles:{ background: "#0A1931", color: "#FFC947"},
            label: "Resource",
            field: "resource",
            width: "15%",
            sortable: false,
          },
          {
            headerStyles: { background: "#FFC947", color: "#0A1931" },
            columnStyles:{ background: "#0A1931", color: "#FFC947"},
            label: "Type",
            field: "type",
            width: "15%",
            sortable: false,
          },
          {
            headerStyles: { background: "#FFC947", color: "#0A1931" },
            columnStyles:{ background: "#0A1931", color: "#FFC947"},
          label: "",
          field: "quick",
          width: "3%",
          display: function (row) {
            return (
              '<button type="button" data-id="' +
              row._id +
              '" class="is-rows-el quick-btn">Delete</button>'
            );
          },
        },
        ],
        rows: [{
            date: '10-07-2023',
            _id: '64a3a00b638194244687b676',
            subdomain: 'domain-forge.mdgspace.org',
            resource: 'example.com',
            type: 'URL'
          },
        ],
        totalRecordCount: 1,
      };

</script>
<template>
  <div id = "navbar">
    <h5>Hey {{user}}!</h5>
  </div>
    <div id="container">
      <h3>Your subdomains: </h3>
      <table-lite
      :page-size="3"
      :is-static-mode="true"
      :is-loading="table.isLoading"
      :columns="table.columns"
      :rows="table.rows"
      :total="table.totalRecordCount"
      @is-finished="table.isLoading = false"
    style="background-color: #0A1931; padding: 2%;"></table-lite>
    <br>
    <button>Add</button>
    </div>
</template>
<script>

</script>
