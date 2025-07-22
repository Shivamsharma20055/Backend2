class ApiError extends Error{
    constructor(status,
        message="something went wrong",
        errors=[],
        stack=""
    ){
         super(message);
        this.status=status;
       
        this.erros=errors;
        this.success=false;
        this.message=message;
        if(stack){
            this.stack =stack;
        }
        else{
            Error.captureStackTrace(this,this.constructor)

        }


    }

}
export {ApiError}