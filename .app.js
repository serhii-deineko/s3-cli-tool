import dotenv from "dotenv";
import AWS from "aws-sdk";
import inquirer from "inquirer";

dotenv.config();

// Configure AWS SDK
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const s3 = new AWS.S3({
    signatureVersion: "v2",
});

const actions = {
    listFiles: async () => {
        const params = {
            Bucket: process.env.S3_BUCKET,
        };
        const data = await s3.listObjectsV2(params).promise();
        data.Contents.forEach((file) => console.log(file.Key));
    },

    uploadFile: async () => {
        const answers = await inquirer.prompt([
            {
                type: "input",
                name: "filePath",
                message: "Enter the path of the file to upload:",
            },
            {
                type: "input",
                name: "destPath",
                message: "Enter the destination path in the bucket (including file name):",
            },
        ]);
        const fileContent = require("fs").readFileSync(answers.filePath);
        const params = {
            Bucket: process.env.S3_BUCKET,
            Key: answers.destPath,
            Body: fileContent,
        };
        await s3.upload(params).promise();
        console.log(`File uploaded successfully to ${answers.destPath}`);
    },

    filterFiles: async () => {
        const answer = await inquirer.prompt([
            {
                type: "input",
                name: "regex",
                message: "Enter a regex to filter files:",
            },
        ]);
        const regex = new RegExp(answer.regex);
        const params = {
            Bucket: process.env.S3_BUCKET,
        };
        const data = await s3.listObjectsV2(params).promise();
        data.Contents.forEach((file) => {
            if (regex.test(file.Key)) {
                console.log(file.Key);
            }
        });
    },

    deleteFiles: async () => {
        const answer = await inquirer.prompt([
            {
                type: "input",
                name: "regex",
                message: "Enter a regex to delete matching files:",
            },
        ]);
        const regex = new RegExp(answer.regex);
        const params = {
            Bucket: process.env.S3_BUCKET,
        };
        const data = await s3.listObjectsV2(params).promise();
        const deleteParams = {
            Bucket: process.env.S3_BUCKET,
            Delete: { Objects: [] },
        };
        data.Contents.forEach((file) => {
            if (regex.test(file.Key)) {
                deleteParams.Delete.Objects.push({ Key: file.Key });
            }
        });
        if (deleteParams.Delete.Objects.length > 0) {
            await s3.deleteObjects(deleteParams).promise();
            console.log("Files deleted successfully.");
        } else {
            console.log("No files matched the specified regex.");
        }
    },
};

(async function main() {
    const answer = await inquirer.prompt([
        {
            type: "list",
            name: "action",
            message: "Choose an action:",
            choices: ["List files", "Upload file", "Filter files", "Delete files"],
        },
    ]);

    switch (answer.action) {
        case "List files":
            await actions.listFiles();
            break;
        case "Upload file":
            await actions.uploadFile();
            break;
        case "Filter files":
            await actions.filterFiles();
            break;
        case "Delete files":
            await actions.deleteFiles();
            break;
    }
})();
